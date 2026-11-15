// Dirección de arte de una plantilla: cómo debe verse el flyer, no una geometría fija. Toma
// los colores del kit de marca, así que la misma plantilla se ve distinta en cada empresa.
// Detalle y motivos: SDD/arquitectura/datos-del-flyer.md.

export const FLYER_FORMATS = ['SQUARE', 'PORTRAIT', 'STORY'] as const;
export const FLYER_COMPOSITIONS = [
  'PRODUCT_HERO',
  'PRODUCT_PANEL',
  'SCENE',
  'SPLIT',
  'TYPOGRAPHIC',
] as const;
export const FLYER_STYLES = [
  'MINIMALIST',
  'BOLD',
  'ELEGANT',
  'PLAYFUL',
  'CORPORATE',
  'NATURAL',
] as const;
export const FLYER_MODES = ['DARK', 'LIGHT'] as const;
export const FLYER_BACKGROUNDS = ['BRAND_COLOR', 'GRADIENT', 'SCENE', 'STUDIO'] as const;
export const LOGO_POSITIONS = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'] as const;
export const TEXT_DENSITIES = ['MINIMAL', 'BALANCED'] as const;

export type FlyerFormat = (typeof FLYER_FORMATS)[number];
export type FlyerComposition = (typeof FLYER_COMPOSITIONS)[number];
export type FlyerStyle = (typeof FLYER_STYLES)[number];
export type FlyerMode = (typeof FLYER_MODES)[number];
export type FlyerBackground = (typeof FLYER_BACKGROUNDS)[number];
export type LogoPosition = (typeof LOGO_POSITIONS)[number];
export type TextDensity = (typeof TEXT_DENSITIES)[number];

// Qué textos y piezas lleva el flyer. keyAttributes es cuántas características del producto
// mostrar, de 0 a 4.
export interface FlyerElements {
  readonly logo: boolean;
  readonly headline: boolean;
  readonly subheadline: boolean;
  readonly productName: boolean;
  readonly keyAttributes: number;
  readonly regularPrice: boolean;
  readonly promotionPrice: boolean;
  readonly validity: boolean;
  readonly cta: boolean;
  readonly contact: boolean;
  readonly legalText: boolean;
}

export interface FlyerDesignData {
  readonly format: FlyerFormat;
  readonly composition: FlyerComposition;
  readonly style: FlyerStyle;
  readonly mode: FlyerMode;
  readonly background: FlyerBackground;
  readonly logoPosition: LogoPosition;
  readonly textDensity: TextDensity;
  readonly elements: FlyerElements;
  // Indicaciones de la marca que valen para todos los flyers de esta plantilla.
  readonly instructions: string | null;
  // Hasta 2 flyers de ejemplo; la IA los usa solo como estilo.
  readonly styleReferenceAssetIds: readonly string[];
}

// Tamaño en píxeles del flyer final de cada formato, para redes sociales.
export const FORMAT_SIZES: Readonly<Record<FlyerFormat, { width: number; height: number }>> =
  Object.freeze({
    SQUARE: Object.freeze({ width: 1080, height: 1080 }),
    PORTRAIT: Object.freeze({ width: 1080, height: 1350 }),
    STORY: Object.freeze({ width: 1080, height: 1920 }),
  });

const BOOLEAN_ELEMENTS = [
  'logo',
  'headline',
  'subheadline',
  'productName',
  'regularPrice',
  'promotionPrice',
  'validity',
  'cta',
  'contact',
  'legalText',
] as const;
export const MAX_KEY_ATTRIBUTES = 4;

export const DEFAULT_FLYER_DESIGN: FlyerDesignData = Object.freeze({
  format: 'SQUARE',
  composition: 'PRODUCT_HERO',
  style: 'BOLD',
  mode: 'DARK',
  background: 'BRAND_COLOR',
  logoPosition: 'TOP_RIGHT',
  textDensity: 'BALANCED',
  elements: Object.freeze({
    logo: true,
    headline: true,
    subheadline: false,
    productName: true,
    keyAttributes: 0,
    regularPrice: true,
    promotionPrice: true,
    validity: true,
    cta: true,
    contact: false,
    legalText: false,
  }),
  instructions: null,
  styleReferenceAssetIds: Object.freeze([]),
});

export const INSTRUCTIONS_MAX_LENGTH = 300;
export const MAX_STYLE_REFERENCES = 2;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidFlyerDesignError extends Error {
  constructor(readonly field: string) {
    super(`El diseño de la plantilla no es válido: ${field}.`);
    this.name = 'InvalidFlyerDesignError';
  }
}

function oneOf<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (!options.includes(value as T)) throw new InvalidFlyerDesignError(field);
  return value as T;
}

function plainObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidFlyerDesignError(field);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], field: string) {
  const extra = Object.keys(value).find((key) => !keys.includes(key));
  if (extra) throw new InvalidFlyerDesignError(`${field}.${extra}`);
}

const DESIGN_KEYS = [
  'format',
  'composition',
  'style',
  'mode',
  'background',
  'logoPosition',
  'textDensity',
  'elements',
  'instructions',
  'styleReferenceAssetIds',
] as const;

// Opcionales al recibir, para aceptar el JSON de revisiones anteriores a estos campos.
function instructions(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || value.trim().length > INSTRUCTIONS_MAX_LENGTH)
    throw new InvalidFlyerDesignError('instructions');
  return value.trim() || null;
}

function styleReferences(value: unknown): readonly string[] {
  if (value == null) return Object.freeze([]);
  if (
    !Array.isArray(value) ||
    value.length > MAX_STYLE_REFERENCES ||
    value.some((id) => typeof id !== 'string' || !UUID.test(id))
  )
    throw new InvalidFlyerDesignError('styleReferenceAssetIds');
  const ids = value.map((id: string) => id.toLowerCase());
  if (new Set(ids).size !== ids.length) throw new InvalidFlyerDesignError('styleReferenceAssetIds');
  return Object.freeze(ids);
}

export class FlyerDesign {
  private constructor(readonly data: FlyerDesignData) {
    Object.freeze(this);
  }

  /** Valida un diseño completo; sin argumento devuelve el diseño por defecto. */
  static create(input: unknown = DEFAULT_FLYER_DESIGN): FlyerDesign {
    const value = plainObject(input, 'design');
    exactKeys(value, DESIGN_KEYS, 'design');
    const elements = plainObject(value.elements, 'elements');
    exactKeys(elements, [...BOOLEAN_ELEMENTS, 'keyAttributes'], 'elements');
    const flags = Object.fromEntries(
      BOOLEAN_ELEMENTS.map((key) => {
        if (typeof elements[key] !== 'boolean')
          throw new InvalidFlyerDesignError(`elements.${key}`);
        return [key, elements[key]];
      }),
    );
    const keyAttributes = elements.keyAttributes;
    if (
      !Number.isInteger(keyAttributes) ||
      (keyAttributes as number) < 0 ||
      (keyAttributes as number) > MAX_KEY_ATTRIBUTES
    )
      throw new InvalidFlyerDesignError('elements.keyAttributes');
    return new FlyerDesign(
      Object.freeze({
        format: oneOf(value.format, FLYER_FORMATS, 'format'),
        composition: oneOf(value.composition, FLYER_COMPOSITIONS, 'composition'),
        style: oneOf(value.style, FLYER_STYLES, 'style'),
        mode: oneOf(value.mode, FLYER_MODES, 'mode'),
        background: oneOf(value.background, FLYER_BACKGROUNDS, 'background'),
        logoPosition: oneOf(value.logoPosition, LOGO_POSITIONS, 'logoPosition'),
        textDensity: oneOf(value.textDensity, TEXT_DENSITIES, 'textDensity'),
        elements: Object.freeze({
          ...flags,
          keyAttributes: keyAttributes as number,
        }) as FlyerElements,
        instructions: instructions(value.instructions),
        styleReferenceAssetIds: styleReferences(value.styleReferenceAssetIds),
      }),
    );
  }

  get size(): { width: number; height: number } {
    return FORMAT_SIZES[this.data.format];
  }
}
