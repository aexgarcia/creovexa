import { entityId } from '#app/domain/entity-id';
import { FlyerDesign } from '#app/domain/value-objects/flyer-design';
import { Money } from '#app/domain/value-objects/money';
import { CampaignObjective } from '../campaign-objective.js';
import { CopyChannel } from '../copy-channel.js';
import { InvalidCampaignError } from '../errors/campaign.errors.js';
import { Promotion } from './promotion.js';

// Datos de otros módulos que se congelan al pedir una generación. Los validan sus módulos de
// origen; aquí solo se comprueba su forma, para no duplicar sus reglas.
export interface GenerationResources {
  organization: {
    id: string;
    name: string;
    description: string;
    brandTone: string | null;
    industry: string | null;
    region: { country: string; locale: string; timeZone: string; currency: string };
    // Los del kit de marca o, si no se fijaron, los propuestos desde el logo.
    brandColors: {
      primary: string;
      secondary: string;
      accent: string;
      lightBackground: string;
      darkBackground: string;
    } | null;
    typography: string | null;
    visualStyle: readonly string[];
    contact: {
      whatsapp: string | null;
      website: string | null;
      instagram: string | null;
      address: string | null;
    } | null;
    defaultLegalText: string | null;
    forbiddenWords: readonly string[];
    // Voz del copy (ADR-0029). En snapshots anteriores: null, [], FEW y TU.
    audience: string | null;
    valueProps: readonly string[];
    emojiStyle: string;
    addressForm: string;
    copyExamples: readonly string[];
    logoAssetId: string | null;
    darkBackgroundLogoAssetId: string | null;
    iconAssetId: string | null;
    // Derivado del logo principal; null si no hay logo o se subió antes de calcularlo.
    logoIsDark: boolean | null;
  };
  product: {
    id: string;
    organizationId: string;
    // PRODUCT o SERVICE; null solo en snapshots guardados antes de que existiera.
    kind: string | null;
    name: string;
    shortName: string | null;
    productBrand: string | null;
    description: string;
    keyAttributes: readonly string[];
    unit: string | null;
    // Datos de venta (ADR-0029); [] y null en snapshots anteriores.
    benefits: readonly string[];
    idealFor: string | null;
    regularPrice: { amountMinor: number; currency: string };
    imageAssetIds: readonly string[];
    // De la foto actual; null si no hay foto o se subió antes de existir estos datos.
    photoType: string | null;
    hasTransparency: boolean | null;
  };
  template: {
    id: string;
    organizationId: string;
    revisionId: string;
    revisionNumber: number;
    width: number;
    height: number;
    // null solo en snapshots guardados antes de que la plantilla fuera dirección de arte.
    design: unknown;
  };
}

// Lo que la campaña aporta al snapshot.
export interface CampaignBrief {
  objective: CampaignObjective;
  occasion: string | null;
  // INSTAGRAM en snapshots anteriores (ADR-0032).
  channel: CopyChannel;
  instructions: string;
  cta: string;
  promotion: Promotion | null;
}

const HEX_COLOR = /^#[0-9A-F]{6}$/;
const COLOR_KEYS = ['primary', 'secondary', 'accent', 'lightBackground', 'darkBackground'] as const;
const CONTACT_KEYS = ['whatsapp', 'website', 'instagram', 'address'] as const;

function text(value: string, field: string, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()))
    throw new InvalidCampaignError(field);
  return value.trim();
}

function optionalText(value: string | null, field: string): string | null {
  if (value === null) return null;
  return text(value, field, false) || null;
}

function optionalBoolean(value: boolean | null, field: string): boolean | null {
  if (value !== null && typeof value !== 'boolean') throw new InvalidCampaignError(field);
  return value;
}

function texts(value: readonly string[], field: string): readonly string[] {
  if (!Array.isArray(value)) throw new InvalidCampaignError(field);
  return Object.freeze(value.map((item: string) => text(item, field)));
}

function colors(value: GenerationResources['organization']['brandColors']) {
  if (value === null) return null;
  if (typeof value !== 'object') throw new InvalidCampaignError('brandColors');
  return Object.freeze(
    Object.fromEntries(
      COLOR_KEYS.map((key) => {
        if (typeof value[key] !== 'string' || !HEX_COLOR.test(value[key]))
          throw new InvalidCampaignError(`brandColors.${key}`);
        return [key, value[key]];
      }),
    ) as Record<(typeof COLOR_KEYS)[number], string>,
  );
}

function contact(value: GenerationResources['organization']['contact']) {
  if (value === null) return null;
  if (typeof value !== 'object') throw new InvalidCampaignError('contact');
  return Object.freeze(
    Object.fromEntries(
      CONTACT_KEYS.map((key) => [key, optionalText(value[key] ?? null, `contact.${key}`)]),
    ) as Record<(typeof CONTACT_KEYS)[number], string | null>,
  );
}

function design(value: unknown) {
  if (value === null) return null;
  try {
    return FlyerDesign.create(value).data;
  } catch {
    throw new InvalidCampaignError('template.design');
  }
}

function optionalId(value: string | null, field: string) {
  return value === null ? null : entityId(value, field);
}

function snapshotData(resources: GenerationResources, brief: CampaignBrief) {
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
  const promotion = brief.promotion;
  if (promotion !== null && !(promotion instanceof Promotion))
    throw new InvalidCampaignError('promotion');
  promotion?.assertCompatibleWith(price);
  if (!Object.values(CampaignObjective).includes(brief.objective))
    throw new InvalidCampaignError('objective');
  if (!Object.values(CopyChannel).includes(brief.channel))
    throw new InvalidCampaignError('channel');
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
  const organization = resources.organization;
  const region = organization.region;
  if (!region || typeof region !== 'object') throw new InvalidCampaignError('region');
  const product = resources.product;
  return Object.freeze({
    organization: Object.freeze({
      id: organizationId,
      name: text(organization.name, 'organization.name'),
      description: text(organization.description, 'organization.description', false),
      brandTone: optionalText(organization.brandTone, 'brandTone'),
      industry: optionalText(organization.industry, 'industry'),
      region: Object.freeze({
        country: text(region.country, 'region.country'),
        locale: text(region.locale, 'region.locale'),
        timeZone: text(region.timeZone, 'region.timeZone'),
        currency: text(region.currency, 'region.currency'),
      }),
      brandColors: colors(organization.brandColors),
      typography: optionalText(organization.typography, 'typography'),
      visualStyle: texts(organization.visualStyle, 'visualStyle'),
      contact: contact(organization.contact),
      defaultLegalText: optionalText(organization.defaultLegalText, 'defaultLegalText'),
      forbiddenWords: texts(organization.forbiddenWords, 'forbiddenWords'),
      audience: optionalText(organization.audience, 'audience'),
      valueProps: texts(organization.valueProps, 'valueProps'),
      emojiStyle: text(organization.emojiStyle, 'emojiStyle'),
      addressForm: text(organization.addressForm, 'addressForm'),
      copyExamples: texts(organization.copyExamples, 'copyExamples'),
      logoAssetId: optionalId(organization.logoAssetId, 'logoAssetId'),
      darkBackgroundLogoAssetId: optionalId(
        organization.darkBackgroundLogoAssetId,
        'darkBackgroundLogoAssetId',
      ),
      iconAssetId: optionalId(organization.iconAssetId, 'iconAssetId'),
      logoIsDark:
        organization.logoAssetId === null
          ? null
          : optionalBoolean(organization.logoIsDark, 'logoIsDark'),
    }),
    product: Object.freeze({
      id: entityId(product.id, 'productId'),
      organizationId,
      kind: optionalText(product.kind, 'product.kind'),
      name: text(product.name, 'product.name'),
      shortName: optionalText(product.shortName, 'product.shortName'),
      productBrand: optionalText(product.productBrand, 'product.productBrand'),
      description: text(product.description, 'product.description', false),
      keyAttributes: texts(product.keyAttributes, 'product.keyAttributes'),
      unit: optionalText(product.unit, 'product.unit'),
      benefits: texts(product.benefits, 'product.benefits'),
      idealFor: optionalText(product.idealFor, 'product.idealFor'),
      regularPrice: Object.freeze({ amountMinor: price.amountMinor, currency: price.currency }),
      imageAssetIds: Object.freeze(imageAssetIds),
      photoType: imageAssetIds.length ? optionalText(product.photoType, 'product.photoType') : null,
      hasTransparency: imageAssetIds.length
        ? optionalBoolean(product.hasTransparency, 'product.hasTransparency')
        : null,
    }),
    template: Object.freeze({
      id: entityId(template.id, 'templateId'),
      organizationId,
      revisionId: entityId(template.revisionId, 'templateRevisionId'),
      revisionNumber: template.revisionNumber,
      width: template.width,
      height: template.height,
      design: design(template.design),
    }),
    objective: brief.objective,
    occasion: optionalText(brief.occasion, 'occasion'),
    channel: brief.channel,
    instructions: text(brief.instructions, 'instructions', false),
    cta: text(brief.cta, 'cta'),
    promotion: promotion?.toSnapshot() ?? null,
  });
}

export type GenerationSnapshotData = ReturnType<typeof snapshotData>;

export class GenerationSnapshot {
  private constructor(readonly data: GenerationSnapshotData) {
    Object.freeze(this);
  }

  static capture(resources: GenerationResources, brief: CampaignBrief): GenerationSnapshot {
    return new GenerationSnapshot(snapshotData(resources, brief));
  }

  equals(other: GenerationSnapshot): boolean {
    return JSON.stringify(this.data) === JSON.stringify(other.data);
  }
}
