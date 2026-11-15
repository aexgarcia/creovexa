import { FlyerDesign, type FlyerDesignData } from '#app/domain/value-objects/flyer-design';

// Plantillas que trae el sistema como ejemplo. No pertenecen a ninguna organización: usar una
// crea una copia propia, con sus revisiones como cualquier plantilla. No llevan colores; toman
// los del kit de marca, así que la misma base se ve distinta en cada empresa.
export interface BaseTemplate {
  readonly key: string;
  readonly name: string;
  readonly intendedFor: string;
  readonly design: FlyerDesignData;
}

const base = (key: string, name: string, intendedFor: string, design: unknown): BaseTemplate =>
  Object.freeze({ key, name, intendedFor, design: FlyerDesign.create(design).data });

export const BASE_TEMPLATES: readonly BaseTemplate[] = Object.freeze([
  base('PROMOTION', 'Promoción destacada', 'Precio especial de un producto', {
    format: 'SQUARE',
    composition: 'PRODUCT_HERO',
    style: 'BOLD',
    mode: 'DARK',
    background: 'BRAND_COLOR',
    logoPosition: 'TOP_RIGHT',
    textDensity: 'BALANCED',
    elements: {
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
      legalText: true,
    },
  }),
  base('SHOWCASE', 'Producto en vitrina', 'Mostrar un producto con su precio, sin promoción', {
    format: 'SQUARE',
    composition: 'PRODUCT_PANEL',
    style: 'MINIMALIST',
    mode: 'LIGHT',
    background: 'STUDIO',
    logoPosition: 'TOP_LEFT',
    textDensity: 'MINIMAL',
    elements: {
      logo: true,
      headline: true,
      subheadline: false,
      productName: true,
      keyAttributes: 3,
      regularPrice: true,
      promotionPrice: true,
      validity: false,
      cta: true,
      contact: false,
      legalText: false,
    },
  }),
  base(
    'LAUNCH',
    'Lanzamiento',
    'Presentar algo nuevo; el protagonista es la novedad, no el precio',
    {
      format: 'PORTRAIT',
      composition: 'SCENE',
      style: 'ELEGANT',
      mode: 'DARK',
      background: 'SCENE',
      logoPosition: 'TOP_LEFT',
      textDensity: 'MINIMAL',
      elements: {
        logo: true,
        headline: true,
        subheadline: true,
        productName: true,
        keyAttributes: 3,
        regularPrice: false,
        promotionPrice: false,
        validity: false,
        cta: true,
        contact: false,
        legalText: false,
      },
    },
  ),
  base(
    'PROFESSIONAL_SERVICE',
    'Servicio profesional',
    'Clínicas, estudios, talleres y otros servicios',
    {
      format: 'SQUARE',
      composition: 'SPLIT',
      style: 'CORPORATE',
      mode: 'LIGHT',
      background: 'BRAND_COLOR',
      logoPosition: 'TOP_LEFT',
      textDensity: 'BALANCED',
      elements: {
        logo: true,
        headline: true,
        subheadline: true,
        productName: true,
        keyAttributes: 2,
        regularPrice: true,
        promotionPrice: true,
        validity: true,
        cta: true,
        contact: true,
        legalText: true,
      },
    },
  ),
  base('SEASONAL_STORY', 'Historia de temporada', 'Historias de Instagram y fechas especiales', {
    format: 'STORY',
    composition: 'SCENE',
    style: 'PLAYFUL',
    mode: 'LIGHT',
    background: 'SCENE',
    logoPosition: 'TOP_RIGHT',
    textDensity: 'MINIMAL',
    elements: {
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
      legalText: true,
    },
  }),
]);

export function findBaseTemplate(key: string): BaseTemplate | null {
  return BASE_TEMPLATES.find((template) => template.key === key) ?? null;
}
