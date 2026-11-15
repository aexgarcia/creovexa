// Dirección de arte de una plantilla: cómo debe verse el flyer. Los colores salen del kit de
// marca de la empresa; la plantilla no los fija.
export type TemplateFormat = 'SQUARE' | 'PORTRAIT' | 'STORY';
export type TemplateComposition =
  | 'PRODUCT_HERO'
  | 'PRODUCT_PANEL'
  | 'SCENE'
  | 'SPLIT'
  | 'TYPOGRAPHIC';
export type TemplateStyle = 'MINIMALIST' | 'BOLD' | 'ELEGANT' | 'PLAYFUL' | 'CORPORATE' | 'NATURAL';
export type TemplateMode = 'DARK' | 'LIGHT';
export type TemplateBackground = 'BRAND_COLOR' | 'GRADIENT' | 'SCENE' | 'STUDIO';
export type LogoPosition = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';
export type TextDensity = 'MINIMAL' | 'BALANCED';

export interface TemplateElements {
  logo: boolean;
  headline: boolean;
  subheadline: boolean;
  productName: boolean;
  // Cuántas características del producto mostrar, de 0 a 4.
  keyAttributes: number;
  regularPrice: boolean;
  promotionPrice: boolean;
  validity: boolean;
  cta: boolean;
  contact: boolean;
  legalText: boolean;
}

export interface TemplateDesign {
  format: TemplateFormat;
  composition: TemplateComposition;
  style: TemplateStyle;
  mode: TemplateMode;
  background: TemplateBackground;
  logoPosition: LogoPosition;
  textDensity: TextDensity;
  elements: TemplateElements;
}

export const FORMAT_SIZES: Record<TemplateFormat, { width: number; height: number }> = {
  SQUARE: { width: 1080, height: 1080 },
  PORTRAIT: { width: 1080, height: 1350 },
  STORY: { width: 1080, height: 1920 },
};

export function defaultTemplateDesign(): TemplateDesign {
  return {
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
      legalText: false,
    },
  };
}

export interface BaseTemplate {
  key: string;
  name: string;
  intendedFor: string;
  design: TemplateDesign;
}
