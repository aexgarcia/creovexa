import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { InvalidOrganizationProfileError } from '../errors/organization.errors.js';
import { brandColors, type BrandColors, type LogoTraits } from '../value-objects/brand-colors.js';
import { DEFAULT_REGION, region, type Region, type RegionInput } from '../value-objects/region.js';
import {
  FORBIDDEN_WORD_LIMITS,
  LEGAL_TEXT_MAX_LENGTH,
  VISUAL_STYLE_LIMITS,
  contact,
  typography,
  wordList,
  type Contact,
  type ContactInput,
  type Typography,
} from '../value-objects/brand-voice.js';

export interface OrganizationProfile {
  name: string;
  description?: string;
  brandTone?: string | null;
  industry?: string | null;
  region?: RegionInput;
  // null vuelve a los colores que propone el logo.
  brandColors?: BrandColors | null;
  typography?: Typography | null;
  // Hasta 5 palabras clave del estilo visual de la marca.
  visualStyle?: readonly string[];
  contact?: ContactInput | null;
  // Se agrega al texto legal del flyer cuando la plantilla lo muestra.
  defaultLegalText?: string | null;
  // Palabras que el flyer nunca debe usar; se suman a las del sistema.
  forbiddenWords?: readonly string[];
  logoAssetId?: string | null;
}

export type OrganizationProfileChanges = Partial<OrganizationProfile>;

interface OrganizationState {
  id: EntityId;
  name: string;
  description: string;
  brandTone: string | null;
  industry: string | null;
  region: Region;
  brandColors: BrandColors | null;
  typography: Typography | null;
  visualStyle: readonly string[];
  contact: Contact | null;
  defaultLegalText: string | null;
  forbiddenWords: readonly string[];
  logoAssetId: EntityId | null;
  logoTraits: LogoTraits | null;
  createdAt: number;
  updatedAt: number;
}

const INDUSTRY_MAX_LENGTH = 80;

function text(value: string, field: string): string {
  if (typeof value !== 'string' || (field === 'name' && !value.trim())) {
    throw new InvalidOrganizationProfileError(field);
  }
  return value.trim();
}

function optionalText(value: string | null | undefined, field: string, max?: number) {
  if (value == null) return null;
  const result = text(value, field);
  if (max !== undefined && result.length > max) throw new InvalidOrganizationProfileError(field);
  return result || null;
}

// undefined significa "sin cambios"; null sí es un valor (borrar).
const keep = <T>(value: T | undefined, current: T): T => (value === undefined ? current : value);

function profile(input: OrganizationProfile, base: Region = DEFAULT_REGION) {
  return {
    name: text(input.name, 'name'),
    description: text(input.description === undefined ? '' : input.description, 'description'),
    brandTone: optionalText(input.brandTone, 'brandTone'),
    industry: optionalText(input.industry, 'industry', INDUSTRY_MAX_LENGTH),
    region: region(input.region ?? {}, base),
    brandColors: input.brandColors == null ? null : brandColors(input.brandColors),
    typography: typography(input.typography),
    visualStyle: wordList(input.visualStyle, 'visualStyle', VISUAL_STYLE_LIMITS),
    contact: contact(input.contact),
    defaultLegalText: optionalText(
      input.defaultLegalText,
      'defaultLegalText',
      LEGAL_TEXT_MAX_LENGTH,
    ),
    forbiddenWords: wordList(input.forbiddenWords, 'forbiddenWords', FORBIDDEN_WORD_LIMITS),
    logoAssetId: input.logoAssetId == null ? null : entityId(input.logoAssetId, 'logoAssetId'),
  };
}

export class Organization {
  readonly #state: Readonly<OrganizationState>;

  private constructor(state: OrganizationState) {
    this.#state = Object.freeze(state);
  }

  static create(id: string, input: OrganizationProfile, at: Date): Organization {
    return Organization.restore(id, input, at, at);
  }

  /** logoTraits: lo que se derivó del logo actual; solo existe si hay logo. */
  static restore(
    id: string,
    input: OrganizationProfile,
    created: Date,
    updated: Date,
    logoTraits: LogoTraits | null = null,
  ): Organization {
    const createdAt = timestamp(created);
    const restored = profile(input);
    return new Organization({
      id: entityId(id),
      ...restored,
      logoTraits: restored.logoAssetId ? logoTraits : null,
      createdAt,
      updatedAt: timestamp(updated, createdAt),
    });
  }

  updateProfile(changes: OrganizationProfileChanges, at: Date): Organization {
    const updatedProfile = profile(
      {
        name: keep(changes.name, this.name),
        description: keep(changes.description, this.description),
        brandTone: keep(changes.brandTone, this.brandTone),
        industry: keep(changes.industry, this.industry),
        // Los campos de región que no llegan conservan su valor actual.
        region: changes.region ?? {},
        brandColors: keep(changes.brandColors, this.brandColors),
        typography: keep(changes.typography, this.typography),
        visualStyle: keep(changes.visualStyle, this.visualStyle),
        contact: keep(changes.contact, this.contact),
        defaultLegalText: keep(changes.defaultLegalText, this.defaultLegalText),
        forbiddenWords: keep(changes.forbiddenWords, this.forbiddenWords),
        logoAssetId: keep(changes.logoAssetId, this.logoAssetId),
      },
      this.region,
    );
    return new Organization({
      ...this.#state,
      ...updatedProfile,
      // Los rasgos son del logo actual; con otro logo, o sin logo, dejan de valer.
      logoTraits: updatedProfile.logoAssetId === this.logoAssetId ? this.logoTraits : null,
      updatedAt: timestamp(at, this.#state.updatedAt),
    });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get name(): string {
    return this.#state.name;
  }
  get description(): string {
    return this.#state.description;
  }
  get brandTone(): string | null {
    return this.#state.brandTone;
  }
  get industry(): string | null {
    return this.#state.industry;
  }
  get region(): Region {
    return this.#state.region;
  }
  /** Los colores que eligió el usuario; null si no eligió ninguno. */
  get brandColors(): BrandColors | null {
    return this.#state.brandColors;
  }
  /** Los colores que usa el flyer: los del usuario o, si no hay, los que propone el logo. */
  get effectiveBrandColors(): BrandColors | null {
    return this.#state.brandColors ?? this.#state.logoTraits?.suggestedColors ?? null;
  }
  get typography(): Typography | null {
    return this.#state.typography;
  }
  get visualStyle(): readonly string[] {
    return this.#state.visualStyle;
  }
  get contact(): Contact | null {
    return this.#state.contact;
  }
  get defaultLegalText(): string | null {
    return this.#state.defaultLegalText;
  }
  get forbiddenWords(): readonly string[] {
    return this.#state.forbiddenWords;
  }
  get logoAssetId(): EntityId | null {
    return this.#state.logoAssetId;
  }
  get logoTraits(): LogoTraits | null {
    return this.#state.logoTraits;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
