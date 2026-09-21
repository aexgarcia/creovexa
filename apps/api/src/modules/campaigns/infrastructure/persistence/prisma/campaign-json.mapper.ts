import { entityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import { Money } from '#app/domain/value-objects/money';
import { InvalidCampaignError } from '../../../domain/errors/campaign.errors.js';
import { GenerationSnapshot } from '../../../domain/value-objects/generation-snapshot.js';
import { Promotion } from '../../../domain/value-objects/promotion.js';
import { PublicationProgress } from '../../../domain/value-objects/publication-progress.js';

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new InvalidCampaignError('storedJson');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new InvalidCampaignError('storedJson');
  return value;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value))
    throw new InvalidCampaignError('storedJson');
  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new InvalidCampaignError('storedJson');
  return value;
}
function optionalString(value: unknown): string | null {
  return value === null ? null : string(value);
}
function date(value: unknown): Date | null {
  if (value === null) return null;
  const result = new Date(string(value));
  if (!Number.isFinite(result.getTime()) || result.toISOString() !== value)
    throw new InvalidCampaignError('storedDate');
  return result;
}

export function readPromotion(value: unknown): Promotion | null {
  if (value === null) return null;
  const data = object(value);
  return Promotion.restore(
    Money.fromMinorUnits(number(data.amountMinor), string(data.currency)),
    date(data.startsAt),
    date(data.endsAt),
  );
}

export function readGenerationSnapshot(value: unknown): GenerationSnapshot {
  const data = object(value);
  const organization = object(data.organization);
  const product = object(data.product);
  const price = object(product.regularPrice);
  const template = object(data.template);
  return GenerationSnapshot.capture(
    {
      organization: {
        id: string(organization.id),
        name: string(organization.name),
        description: string(organization.description),
        brandTone: optionalString(organization.brandTone),
        logoAssetId: optionalString(organization.logoAssetId),
      },
      product: {
        id: string(product.id),
        organizationId: string(product.organizationId),
        name: string(product.name),
        description: string(product.description),
        regularPrice: { amountMinor: number(price.amountMinor), currency: string(price.currency) },
        imageAssetIds: array(product.imageAssetIds).map(string),
      },
      template: {
        id: string(template.id),
        organizationId: string(template.organizationId),
        revisionId: string(template.revisionId),
        revisionNumber: number(template.revisionNumber),
        width: number(template.width),
        height: number(template.height),
      },
    },
    string(data.instructions),
    string(data.cta),
    readPromotion(data.promotion),
  );
}

export function readPublicationProgress(
  value: unknown,
  organizationId: string,
  campaignId: string,
  approvedContentId: string | null,
  accounts: readonly string[],
): PublicationProgress | null {
  if (value === null) return null;
  if (!approvedContentId) throw new InvalidCampaignError('approvedContentId');
  const entries = array(value).map((item) => {
    const data = object(item);
    const status = Object.values(PublicationStatus).find((status) => status === data.status);
    if (!status) throw new InvalidCampaignError('publicationStatus');
    return {
      publicationId: string(data.publicationId),
      organizationId: string(data.organizationId),
      campaignId: string(data.campaignId),
      approvedContentId: string(data.approvedContentId),
      socialAccountId: string(data.socialAccountId),
      status,
      version: number(data.version),
    };
  });
  return PublicationProgress.restore(
    entityId(organizationId),
    entityId(campaignId),
    entityId(approvedContentId),
    accounts.map((id) => entityId(id)),
    entries,
  );
}
