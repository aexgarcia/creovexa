import { entityId } from '#app/domain/entity-id';
import { Money } from '#app/domain/value-objects/money';
import { InvalidCampaignError } from '../errors/campaign.errors.js';
import { Promotion } from './promotion.js';

export interface GenerationResources {
  organization: {
    id: string;
    name: string;
    description: string;
    brandTone: string | null;
    logoAssetId: string | null;
  };
  product: {
    id: string;
    organizationId: string;
    name: string;
    description: string;
    regularPrice: { amountMinor: number; currency: string };
    imageAssetIds: readonly string[];
  };
  template: {
    id: string;
    organizationId: string;
    revisionId: string;
    revisionNumber: number;
    width: number;
    height: number;
  };
}

function text(value: string, field: string, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()))
    throw new InvalidCampaignError(field);
  return value.trim();
}

function snapshotData(
  resources: GenerationResources,
  instructions: string,
  cta: string,
  promotion: Promotion | null,
) {
  const organizationId = entityId(resources.organization.id, 'organizationId');
  if (
    entityId(resources.product.organizationId, 'product.organizationId') !== organizationId ||
    entityId(resources.template.organizationId, 'template.organizationId') !== organizationId
  )
    throw new InvalidCampaignError('organizationId');
  const price = Money.fromMinorUnits(
    resources.product.regularPrice.amountMinor,
    resources.product.regularPrice.currency,
  );
  if (promotion !== null && !(promotion instanceof Promotion))
    throw new InvalidCampaignError('promotion');
  promotion?.assertCompatibleWith(price);
  const template = resources.template;
  if (
    ![template.width, template.height, template.revisionNumber].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  ) {
    throw new InvalidCampaignError('template');
  }
  if (!Array.isArray(resources.product.imageAssetIds))
    throw new InvalidCampaignError('imageAssetIds');
  const imageAssetIds = resources.product.imageAssetIds.map((id: string) =>
    entityId(id, 'imageAssetIds'),
  );
  if (new Set(imageAssetIds).size !== imageAssetIds.length)
    throw new InvalidCampaignError('imageAssetIds');
  return Object.freeze({
    organization: Object.freeze({
      id: organizationId,
      name: text(resources.organization.name, 'organization.name'),
      description: text(resources.organization.description, 'organization.description', false),
      brandTone:
        resources.organization.brandTone === null
          ? null
          : text(resources.organization.brandTone, 'brandTone', false),
      logoAssetId:
        resources.organization.logoAssetId === null
          ? null
          : entityId(resources.organization.logoAssetId, 'logoAssetId'),
    }),
    product: Object.freeze({
      id: entityId(resources.product.id, 'productId'),
      organizationId,
      name: text(resources.product.name, 'product.name'),
      description: text(resources.product.description, 'product.description', false),
      regularPrice: Object.freeze({ amountMinor: price.amountMinor, currency: price.currency }),
      imageAssetIds: Object.freeze(imageAssetIds),
    }),
    template: Object.freeze({
      id: entityId(template.id, 'templateId'),
      organizationId,
      revisionId: entityId(template.revisionId, 'templateRevisionId'),
      revisionNumber: template.revisionNumber,
      width: template.width,
      height: template.height,
    }),
    instructions: text(instructions, 'instructions', false),
    cta: text(cta, 'cta'),
    promotion: promotion?.toSnapshot() ?? null,
  });
}

export type GenerationSnapshotData = ReturnType<typeof snapshotData>;

export class GenerationSnapshot {
  private constructor(readonly data: GenerationSnapshotData) {
    Object.freeze(this);
  }

  static capture(
    resources: GenerationResources,
    instructions: string,
    cta: string,
    promotion: Promotion | null,
  ): GenerationSnapshot {
    return new GenerationSnapshot(snapshotData(resources, instructions, cta, promotion));
  }

  equals(other: GenerationSnapshot): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
}
