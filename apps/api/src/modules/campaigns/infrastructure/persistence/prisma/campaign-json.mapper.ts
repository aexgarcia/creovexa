import { entityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import { Money } from '#app/domain/value-objects/money';
import { CampaignObjective } from '../../../domain/campaign-objective.js';
import { CopyChannel } from '../../../domain/copy-channel.js';
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
function optionalBoolean(value: unknown): boolean | null {
  if (value !== null && typeof value !== 'boolean') throw new InvalidCampaignError('storedJson');
  return value;
}
function optionalObject<T>(value: unknown, read: (data: Record<string, unknown>) => T): T | null {
  return value === null ? null : read(object(value));
}

// Los snapshots y promociones guardados antes de un campo no lo tienen: se leen con su valor
// vacío. Así se siguen leyendo sin reescribir filas inmutables.
function legacy(data: Record<string, unknown>, key: string, empty: unknown): unknown {
  return key in data ? data[key] : empty;
}

// La región que el sistema tenía fija antes de que fuera configurable.
const LEGACY_REGION = { country: 'PE', locale: 'es-PE', timeZone: 'America/Lima', currency: 'PEN' };
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
  const showDiscount = legacy(data, 'showDiscount', false);
  if (typeof showDiscount !== 'boolean') throw new InvalidCampaignError('storedJson');
  return Promotion.restore(
    Money.fromMinorUnits(number(data.amountMinor), string(data.currency)),
    date(data.startsAt),
    date(data.endsAt),
    { conditions: optionalString(legacy(data, 'conditions', null)), showDiscount },
  );
}

export function readGenerationSnapshot(value: unknown): GenerationSnapshot {
  const data = object(value);
  const organization = object(data.organization);
  const product = object(data.product);
  const price = object(product.regularPrice);
  const template = object(data.template);
  const region = object(legacy(organization, 'region', LEGACY_REGION));
  const objective = Object.values(CampaignObjective).find(
    (value) => value === legacy(data, 'objective', CampaignObjective.PROMOTION),
  );
  if (!objective) throw new InvalidCampaignError('storedJson');
  const channel = Object.values(CopyChannel).find(
    (value) => value === legacy(data, 'channel', CopyChannel.INSTAGRAM),
  );
  if (!channel) throw new InvalidCampaignError('storedJson');
  return GenerationSnapshot.capture(
    {
      organization: {
        id: string(organization.id),
        name: string(organization.name),
        description: string(organization.description),
        brandTone: optionalString(organization.brandTone),
        industry: optionalString(legacy(organization, 'industry', null)),
        region: {
          country: string(region.country),
          locale: string(region.locale),
          timeZone: string(region.timeZone),
          currency: string(region.currency),
        },
        brandColors: optionalObject(legacy(organization, 'brandColors', null), (colors) => ({
          primary: string(colors.primary),
          secondary: string(colors.secondary),
          accent: string(colors.accent),
          lightBackground: string(colors.lightBackground),
          darkBackground: string(colors.darkBackground),
        })),
        typography: optionalString(legacy(organization, 'typography', null)),
        visualStyle: array(legacy(organization, 'visualStyle', [])).map(string),
        contact: optionalObject(legacy(organization, 'contact', null), (contact) => ({
          whatsapp: optionalString(contact.whatsapp),
          website: optionalString(contact.website),
          instagram: optionalString(contact.instagram),
          address: optionalString(contact.address),
        })),
        defaultLegalText: optionalString(legacy(organization, 'defaultLegalText', null)),
        forbiddenWords: array(legacy(organization, 'forbiddenWords', [])).map(string),
        audience: optionalString(legacy(organization, 'audience', null)),
        valueProps: array(legacy(organization, 'valueProps', [])).map(string),
        emojiStyle: string(legacy(organization, 'emojiStyle', 'FEW')),
        addressForm: string(legacy(organization, 'addressForm', 'TU')),
        copyExamples: array(legacy(organization, 'copyExamples', [])).map(string),
        logoAssetId: optionalString(organization.logoAssetId),
        darkBackgroundLogoAssetId: optionalString(
          legacy(organization, 'darkBackgroundLogoAssetId', null),
        ),
        iconAssetId: optionalString(legacy(organization, 'iconAssetId', null)),
        logoIsDark: optionalBoolean(legacy(organization, 'logoIsDark', null)),
      },
      product: {
        id: string(product.id),
        organizationId: string(product.organizationId),
        kind: optionalString(legacy(product, 'kind', null)),
        name: string(product.name),
        shortName: optionalString(legacy(product, 'shortName', null)),
        productBrand: optionalString(legacy(product, 'productBrand', null)),
        description: string(product.description),
        keyAttributes: array(legacy(product, 'keyAttributes', [])).map(string),
        unit: optionalString(legacy(product, 'unit', null)),
        benefits: array(legacy(product, 'benefits', [])).map(string),
        idealFor: optionalString(legacy(product, 'idealFor', null)),
        regularPrice: { amountMinor: number(price.amountMinor), currency: string(price.currency) },
        imageAssetIds: array(product.imageAssetIds).map(string),
        photoType: optionalString(legacy(product, 'photoType', null)),
        hasTransparency: optionalBoolean(legacy(product, 'hasTransparency', null)),
      },
      template: {
        id: string(template.id),
        organizationId: string(template.organizationId),
        revisionId: string(template.revisionId),
        revisionNumber: number(template.revisionNumber),
        width: number(template.width),
        height: number(template.height),
        design: legacy(template, 'design', null),
      },
    },
    {
      objective,
      occasion: optionalString(legacy(data, 'occasion', null)),
      channel,
      instructions: string(data.instructions),
      cta: string(data.cta),
      promotion: readPromotion(data.promotion),
    },
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
