export type BrandTone = 'PROFESSIONAL' | 'FRIENDLY' | 'MODERN' | 'ENERGETIC' | 'ELEGANT';

export interface CompanySettings {
  id: string;

  businessName: string;

  description: string;

  logoUrl: string | null;

  brandTone: BrandTone;

  primaryColor: string;

  defaultCta: string;

  createdAt: string;

  updatedAt: string;
}

export interface UpdateCompanySettingsInput {
  businessName: string;

  description: string;

  logoUrl?: string;

  brandTone: BrandTone;

  primaryColor: string;

  defaultCta: string;
}
