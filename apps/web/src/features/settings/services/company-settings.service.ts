import { apiRequest, apiUrl } from '@/lib/api-client';

export type Currency = 'PEN' | 'USD' | 'EUR';
export interface Region {
  country: string;
  locale: string;
  timeZone: string;
  currency: Currency;
}
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  lightBackground: string;
  darkBackground: string;
}
export type Typography =
  | 'SANS_MODERN'
  | 'SERIF_ELEGANT'
  | 'ROUNDED'
  | 'CONDENSED_BOLD'
  | 'HANDWRITTEN';
export interface Contact {
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
}
// Cómo escribe la marca en el copy (ADR-0029).
export type EmojiStyle = 'NONE' | 'FEW' | 'EXPRESSIVE';
export type AddressForm = 'TU' | 'USTED';
// Versión clara del logo, para fondos oscuros, o isotipo.
export type LogoVariant = 'dark-background' | 'icon';
export interface OrganizationSettings {
  id: string;
  name: string;
  description: string;
  brandTone: string | null;
  industry: string | null;
  region: Region;
  // Los que eligió el usuario; null si usa los que propone el logo.
  brandColors: BrandColors | null;
  // Los que usa el flyer.
  effectiveBrandColors: BrandColors | null;
  typography: Typography | null;
  visualStyle: string[];
  contact: Contact | null;
  defaultLegalText: string | null;
  forbiddenWords: string[];
  audience: string | null;
  valueProps: string[];
  emojiStyle: EmojiStyle;
  addressForm: AddressForm;
  copyExamples: string[];
  logoAssetId: string | null;
  logoUrl?: string | null;
  darkBackgroundLogoAssetId: string | null;
  darkBackgroundLogoUrl?: string | null;
  iconAssetId: string | null;
  iconUrl?: string | null;
  logoTraits: { isDark: boolean; suggestedColors: BrandColors } | null;
  createdAt: string;
  updatedAt: string;
}
export interface UpdateOrganizationSettings {
  name?: string;
  description?: string;
  brandTone?: string | null;
  industry?: string | null;
  region?: Partial<Region>;
  // null vuelve a los colores del logo.
  brandColors?: BrandColors | null;
  typography?: Typography | null;
  visualStyle?: string[];
  // Se reemplaza completo; null lo borra.
  contact?: Partial<Contact> | null;
  defaultLegalText?: string | null;
  forbiddenWords?: string[];
  audience?: string | null;
  valueProps?: string[];
  emojiStyle?: EmojiStyle;
  addressForm?: AddressForm;
  copyExamples?: string[];
}
export const companySettingsService = {
  async get(signal?: AbortSignal): Promise<OrganizationSettings> {
    return resolveLogo(
      (await apiRequest<{ data: OrganizationSettings }>('/organization', { signal })).data,
    );
  },
  async update(input: UpdateOrganizationSettings): Promise<OrganizationSettings> {
    // Solo los campos editables: la organización y el logo nunca viajan en este cuerpo.
    const body: UpdateOrganizationSettings = {
      name: input.name,
      description: input.description,
      brandTone: input.brandTone,
      industry: input.industry,
      region: input.region,
      brandColors: input.brandColors,
      typography: input.typography,
      visualStyle: input.visualStyle,
      contact: input.contact,
      defaultLegalText: input.defaultLegalText,
      forbiddenWords: input.forbiddenWords,
      audience: input.audience,
      valueProps: input.valueProps,
      emojiStyle: input.emojiStyle,
      addressForm: input.addressForm,
      copyExamples: input.copyExamples,
    };
    return resolveLogo(
      (
        await apiRequest<{ data: OrganizationSettings }>('/organization', {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      ).data,
    );
  },
  async uploadLogo(file: File): Promise<OrganizationSettings> {
    const body = new FormData();
    body.append('logo', file);
    return resolveLogo(
      (
        await apiRequest<{ data: OrganizationSettings }>(
          '/organization/logo',
          { method: 'POST', body },
          45000,
        )
      ).data,
    );
  },
  async uploadLogoVariant(variant: LogoVariant, file: File): Promise<OrganizationSettings> {
    const body = new FormData();
    body.append('logo', file);
    return resolveLogo(
      (
        await apiRequest<{ data: OrganizationSettings }>(
          `/organization/logo/${variant}`,
          { method: 'POST', body },
          45000,
        )
      ).data,
    );
  },
  async removeLogoVariant(variant: LogoVariant): Promise<OrganizationSettings> {
    return resolveLogo(
      (
        await apiRequest<{ data: OrganizationSettings }>(`/organization/logo/${variant}`, {
          method: 'DELETE',
        })
      ).data,
    );
  },
};
// La API devuelve rutas relativas; el navegador necesita la URL completa.
function resolveLogo(settings: OrganizationSettings): OrganizationSettings {
  const resolved = { ...settings };
  for (const key of ['logoUrl', 'darkBackgroundLogoUrl', 'iconUrl'] as const) {
    const url = resolved[key];
    if (url?.startsWith('/')) resolved[key] = apiUrl(url);
  }
  return resolved;
}
