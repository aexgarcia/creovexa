export type TemplateFormat = 'SQUARE' | 'PORTRAIT' | 'STORY';

export interface TemplateSettings {
  showLogo: boolean;
  showRegularPrice: boolean;
  showPromotionPrice: boolean;
  showHeadline: boolean;
  showCta: boolean;
  showMainImage: boolean;
}

export interface MarketingTemplate {
  id: string;

  name: string;

  description: string;

  format: TemplateFormat;

  width: number;

  height: number;

  thumbnailUrl: string | null;

  isActive: boolean;

  settings: TemplateSettings;

  createdAt: string;

  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;

  description: string;

  format: TemplateFormat;

  isActive: boolean;

  settings: TemplateSettings;
}

export type UpdateTemplateInput = CreateTemplateInput;
