import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
import { GeneratedContent } from '#app/modules/campaigns/domain/entities/generated-content';
import { InvalidCampaignTransitionError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import type { CampaignRepository } from '#app/modules/campaigns/domain/repositories/campaign.repository';
import {
  loadCampaign,
  type CampaignSelection,
} from '#app/modules/campaigns/application/load-campaign';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import type {
  CampaignImageLease,
  CampaignImageRepository,
} from '../ports/campaign-image-repository.js';
import type { ImageArtifact } from '../ports/image-artifact.js';
import type { ImageGenerator } from '../ports/image-generator.js';
import type { ProductImageSource } from '../ports/product-image-source.js';
import type {
  StorageProvider,
  StoredCampaignAsset,
  CampaignAssetPurpose,
} from '../ports/storage-provider.js';
import type { TemplateRenderer } from '../ports/template-renderer.js';

export interface GenerateCampaignImageInput extends CampaignSelection {
  // Pin the reviewed copy's generation; never silently generate a newer revision.
  generationId: string;
}

function assertArtifact(artifact: ImageArtifact) {
  if (
    !artifact ||
    typeof artifact.reference !== 'string' ||
    !artifact.reference.trim() ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(artifact.contentType) ||
    ![artifact.width, artifact.height].every((value) => Number.isSafeInteger(value) && value > 0)
  )
    throw new CampaignImageError('INVALID_OUTPUT');
}

function assertStoredAsset(
  asset: StoredCampaignAsset,
  lease: CampaignImageLease,
  purpose: CampaignAssetPurpose,
  source: ImageArtifact,
) {
  if (
    !asset ||
    asset.organizationId !== lease.organizationId ||
    asset.campaignId !== lease.campaignId ||
    asset.generationId !== lease.generationId ||
    asset.purpose !== purpose ||
    asset.width !== source.width ||
    asset.height !== source.height ||
    asset.contentType !== source.contentType
  )
    throw new CampaignImageError('INVALID_OUTPUT');
  try {
    entityId(asset.id, 'assetId');
  } catch {
    throw new CampaignImageError('INVALID_OUTPUT');
  }
}

export class GenerateCampaignImage {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly copies: CampaignCopyRepository,
    private readonly images: CampaignImageRepository,
    private readonly productImages: ProductImageSource,
    private readonly generator: ImageGenerator,
    private readonly renderer: TemplateRenderer,
    private readonly storage: StorageProvider,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: GenerateCampaignImageInput): Promise<GeneratedContent> {
    const campaign = await loadCampaign(input, this.campaigns);
    const generation = campaign.requireGeneration(input.generationId);
    if (campaign.candidateContent) return campaign.candidateContent;
    if (campaign.status !== CampaignStatus.GENERATING) throw new InvalidCampaignTransitionError();
    const selection = {
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      generationId: generation.id,
    };
    const copy = await this.copies.find(selection);
    if (!copy) throw new CampaignImageError('COPY_REQUIRED');
    // Copy was validated and frozen in phase 5. Do not reinterpret it using a newer copy policy.
    if (copy.cta !== generation.snapshot.data.cta) throw new CampaignImageError('INVALID_OUTPUT');
    if (typeof copy.imagePrompt !== 'string' || !copy.imagePrompt.trim())
      throw new CampaignImageError('INVALID_OUTPUT');
    const snapshot = generation.snapshot.data;
    if (snapshot.product.imageAssetIds.length === 0)
      throw new CampaignImageError('PRODUCT_IMAGE_REQUIRED');
    if (snapshot.product.imageAssetIds.length !== 1) throw new CampaignImageError('INVALID_OUTPUT');
    if (snapshot.template.width !== 1080 || snapshot.template.height !== 1080)
      throw new CampaignImageError('UNSUPPORTED_DIMENSIONS');
    this.productImages.assertAvailable();
    this.generator.assertAvailable();
    this.renderer.assertAvailable();
    this.storage.assertAvailable();
    const now = this.clock.now();
    campaign.promotion?.assertNotExpired(now);
    const lease: CampaignImageLease = {
      ...selection,
      token: entityId(this.ids.next()),
      expectedVersion: campaign.version,
      now,
      expiresAt: new Date(now.getTime() + 300000),
    };
    if (!(await this.images.claim(lease))) throw new CampaignImageError('BUSY');
    try {
      this.assertLeaseTime(lease);
      const referenceImage = await this.productImages.load({
        ...selection,
        operationId: lease.token,
        productId: snapshot.product.id,
        imageAssetId: snapshot.product.imageAssetIds[0],
      });
      assertArtifact(referenceImage);
      this.assertLeaseTime(lease);
      const visualCopy = {
        headline: copy.headline,
        caption: copy.caption,
        cta: copy.cta,
        hashtags: [...copy.hashtags],
      };
      const base = await this.generator.generate({
        ...selection,
        operationId: lease.token,
        referenceImage,
        imagePrompt: copy.imagePrompt,
        copy: { ...visualCopy, hashtags: [...visualCopy.hashtags] },
        snapshot,
      });
      assertArtifact(base);
      this.assertLeaseTime(lease);
      const baseAsset = await this.storage.store({
        ...selection,
        operationId: lease.token,
        purpose: 'BASE_IMAGE',
        source: base,
      });
      assertStoredAsset(baseAsset, lease, 'BASE_IMAGE', base);
      this.assertLeaseTime(lease);
      const final = await this.renderer.render({
        ...selection,
        operationId: lease.token,
        mainImage: baseAsset.id,
        copy: visualCopy,
        snapshot,
      });
      assertArtifact(final);
      if (
        final.contentType !== 'image/png' ||
        final.width !== snapshot.template.width ||
        final.height !== snapshot.template.height
      )
        throw new CampaignImageError('INVALID_OUTPUT');
      this.assertLeaseTime(lease);
      const finalAsset = await this.storage.store({
        ...selection,
        operationId: lease.token,
        purpose: 'FINAL_PIECE',
        source: final,
      });
      assertStoredAsset(finalAsset, lease, 'FINAL_PIECE', final);
      if (baseAsset.id === finalAsset.id) throw new CampaignImageError('INVALID_OUTPUT');
      this.assertLeaseTime(lease);
      const at = this.clock.now();
      campaign.promotion?.assertNotExpired(at);
      const content = GeneratedContent.create(
        {
          ...selection,
          id: this.ids.next(),
          revision: generation.number,
        },
        generation.snapshot,
        {
          headline: copy.headline,
          caption: copy.caption,
          cta: copy.cta,
          hashtags: copy.hashtags,
          assetIds: [finalAsset.id],
        },
        at,
      );
      const updated = campaign.recordGeneratedContent(content, at);
      await this.images.complete(lease, { campaign: updated, baseAsset, finalAsset }, at);
      return content;
    } catch (error) {
      // Never delete assets here: a commit may have succeeded before a transport failure.
      // Expiry recovers the reservation if the repository is temporarily unreachable.
      try {
        await this.images.release(lease);
      } catch {
        /* Preserve the original failure. */
      }
      throw error;
    }
  }

  private assertLeaseTime(lease: CampaignImageLease) {
    if (this.clock.now().getTime() >= lease.expiresAt.getTime())
      throw new CampaignImageError('TIMEOUT');
  }
}
