import { apiRequest, apiUrl } from '@/lib/api-client';
export interface OrganizationSettings {
  id: string;
  name: string;
  description: string;
  brandTone: string | null;
  logoAssetId: string | null;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}
export type UpdateOrganizationSettings = Pick<
  OrganizationSettings,
  'name' | 'description' | 'brandTone'
>;
export const companySettingsService = {
  async get(signal?: AbortSignal): Promise<OrganizationSettings> {
    return resolveLogo(
      (await apiRequest<{ data: OrganizationSettings }>('/organization', { signal })).data,
    );
  },
  async update(input: UpdateOrganizationSettings): Promise<OrganizationSettings> {
    return resolveLogo(
      (
        await apiRequest<{ data: OrganizationSettings }>('/organization', {
          method: 'PATCH',
          body: JSON.stringify({
            name: input.name,
            description: input.description,
            brandTone: input.brandTone,
          }),
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
