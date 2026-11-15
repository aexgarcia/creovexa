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
  logoAssetId: string | null;
  logoUrl?: string | null;
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
};
function resolveLogo(settings: OrganizationSettings): OrganizationSettings {
  return settings.logoUrl?.startsWith('/')
    ? { ...settings, logoUrl: apiUrl(settings.logoUrl) }
    : settings;
}
