import type { TemplateComposition, TemplateFormat, TemplateStyle } from './template-design';

export const FORMAT_LABELS: Record<TemplateFormat, string> = {
  SQUARE: 'Cuadrado',
  PORTRAIT: 'Vertical',
  STORY: 'Historia',
};
export const COMPOSITION_LABELS: Record<TemplateComposition, string> = {
  PRODUCT_HERO: 'Producto protagonista',
  PRODUCT_PANEL: 'Producto en panel',
  SCENE: 'Escena ambientada',
  SPLIT: 'Dividida',
  TYPOGRAPHIC: 'Tipográfica',
};
export const STYLE_LABELS: Record<TemplateStyle, string> = {
  MINIMALIST: 'Minimalista',
  BOLD: 'Audaz',
  ELEGANT: 'Elegante',
  PLAYFUL: 'Divertido',
  CORPORATE: 'Corporativo',
  NATURAL: 'Natural',
};
