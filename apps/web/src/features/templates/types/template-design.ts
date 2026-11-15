import type { TemplateSettings } from './template.types';

export interface TemplateDesign {
  layout: 'CLASSIC' | 'PRODUCT_FOCUS';
  palette: 'BLUE' | 'CORAL';
  settings: TemplateSettings;
}

export function defaultTemplateDesign(): TemplateDesign {
  return {
    layout: 'CLASSIC',
    palette: 'BLUE',
    settings: {
      showLogo: true,
      showRegularPrice: true,
      showPromotionPrice: true,
      showHeadline: true,
      showCta: true,
      showMainImage: true,
    },
  };
}
