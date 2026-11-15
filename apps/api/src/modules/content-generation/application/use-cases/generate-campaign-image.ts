import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import {
  CampaignImageError,
  type CampaignGenerations,
  type CampaignReference,
  type GeneratedCampaignContent,
} from '#app/modules/campaigns/contract';
import { checkImagePreconditions } from '../image-generation-preconditions.js';
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

export interface GenerateCampaignImageInput extends CampaignReference {
  // Fija la generación del copy revisado; nunca genera en silencio una revisión más nueva.
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
    readonly generations: CampaignGenerations,
    readonly copies: CampaignCopyRepository,
    private readonly images: CampaignImageRepository,
    readonly productImages: ProductImageSource,
    readonly generator: ImageGenerator,
    readonly renderer: TemplateRenderer,
    readonly storage: StorageProvider,
    private readonly ids: IdGenerator,
    readonly clock: Clock,
  ) {}

  async execute(input: GenerateCampaignImageInput): Promise<GeneratedCampaignContent> {
    const ready = await checkImagePreconditions(this, input);
    if (ready.done) return ready.done;
    const { campaign, selection, snapshot, copy, now } = ready;
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
      // Campaigns registra el contenido dentro de la misma transacción que cierra la reserva.
      return await this.images.complete(lease, { copy: visualCopy, baseAsset, finalAsset }, at);
    } catch (error) {
      // Nunca borres archivos aquí: el commit pudo completarse antes de un fallo de red.
      // El vencimiento recupera la reserva si el repositorio no responde por un momento.
      try {
        await this.images.release(lease);
      } catch {
        /* Conserva el fallo original. */
      }
      throw error;
    }
  }

  private assertLeaseTime(lease: CampaignImageLease) {
    if (this.clock.now().getTime() >= lease.expiresAt.getTime())
      throw new CampaignImageError('TIMEOUT');
  }
}
