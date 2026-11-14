import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import type { CampaignRenderResources } from '../../../application/ports/campaign-render-resources.js';
import type { RenderCampaignTemplateInput } from '../../../application/ports/template-renderer.js';
import type { MinioStorageProvider } from '../../minio-storage-provider.js';
import { requireImageLease } from './prisma-campaign-image.repository.js';
import { FlyerDesign } from '#app/domain/value-objects/flyer-design';
import type { OrganizationLogos } from '#app/modules/organizations/application/ports/organization-logos';
import { entityId } from '#app/domain/entity-id';

export class PrismaCampaignRenderResources implements CampaignRenderResources {
  constructor(
    private readonly database: PrismaClient,
    private readonly storage: MinioStorageProvider | null,
    private readonly logos: OrganizationLogos,
  ) {}

  assertAvailable(): void {
    if (!this.storage) throw new CampaignImageError('UNAVAILABLE');
    this.storage.assertAvailable();
  }

  async load(input: RenderCampaignTemplateInput) {
    this.assertAvailable();
    const snapshot = input.snapshot;
    if (
      snapshot.organization.id !== input.organizationId ||
      snapshot.product.organizationId !== input.organizationId
    )
      throw new CampaignImageError('INVALID_OUTPUT');
    const template = await this.database.templateRevision.findFirst({
      where: {
        id: snapshot.template.revisionId,
        templateId: snapshot.template.id,
        organizationId: input.organizationId,
        number: BigInt(snapshot.template.revisionNumber),
        width: snapshot.template.width,
        height: snapshot.template.height,
      },
    });
    if (!template) throw new CampaignImageError('INVALID_OUTPUT');
    const selection = {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      generationId: input.generationId,
    };
    await requireImageLease(this.database, selection, input.operationId);
    const row = await this.database.campaignAsset.findFirst({
      where: {
        ...selection,
        id: input.mainImage,
        operationId: input.operationId,
        purpose: 'BASE_IMAGE',
      },
    });
    if (!row) throw new CampaignImageError('INVALID_OUTPUT');
    const stored = await this.storage!.read(input.organizationId, input.mainImage);
    if (!stored) throw new CampaignImageError('INVALID_OUTPUT');
    let logo = null;
    if (snapshot.organization.logoAssetId !== null) {
      try {
        logo = await this.logos.read({
          organizationId: input.organizationId,
          assetId: entityId(snapshot.organization.logoAssetId),
        });
        if (!logo) throw new CampaignImageError('LOGO_UNAVAILABLE');
      } catch {
        throw new CampaignImageError('LOGO_UNAVAILABLE');
      }
    }
    return {
      mainImage: { ...stored.asset, bytes: stored.bytes },
      logo,
      design: FlyerDesign.create(template.design).data,
    };
  }
}
