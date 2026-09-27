import { apiRequest } from '@/lib/api-client';
export interface OrganizationSettings {
  id: string;
  name: string;
  description: string;
  brandTone: string | null;
  logoAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}
export type UpdateOrganizationSettings = Pick<
  OrganizationSettings,
  'name' | 'description' | 'brandTone'
>;
export const companySettingsService = {
  async get(signal?: AbortSignal): Promise<OrganizationSettings> {
    return (await apiRequest<{ data: OrganizationSettings }>('/organization', { signal })).data;
  },
  async update(input: UpdateOrganizationSettings): Promise<OrganizationSettings> {
    return (
      await apiRequest<{ data: OrganizationSettings }>('/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          brandTone: input.brandTone,
        }),
      })
    ).data;
  },
};
