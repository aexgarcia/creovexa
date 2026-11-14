import { apiRequest, apiUrl, type ApiPage } from '@/lib/api-client';
import type {
  CreateStoredCampaignInput,
  StoredCampaign,
  StoredPublication,
} from '../types/stored-campaign.types';
export const campaignApi = {
  async list(page = 1, signal?: AbortSignal): Promise<ApiPage<StoredCampaign>> {
    const result = await apiRequest<ApiPage<StoredCampaign>>(`/campaigns?page=${page}&limit=20`, {
      signal,
    });
    return { ...result, data: result.data.map(resolveImages) };
  },
  async get(id: string, signal?: AbortSignal): Promise<StoredCampaign> {
    return resolveImages(
      (
        await apiRequest<{ data: StoredCampaign }>(`/campaigns/${encodeURIComponent(id)}`, {
          signal,
        })
      ).data,
    );
  },
  async create(input: CreateStoredCampaignInput): Promise<StoredCampaign> {
    return resolveImages(
      (
        await apiRequest<{ data: StoredCampaign }>('/campaigns', {
          method: 'POST',
          body: JSON.stringify(input),
        })
      ).data,
    );
  },
  async approve(id: string, contentId: string): Promise<StoredCampaign> {
    return resolveImages(
      (
        await apiRequest<{ data: StoredCampaign }>(`/campaigns/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
          body: JSON.stringify({ contentId }),
        })
      ).data,
    );
  },
  async generateImage(
    id: string,
    generationId: string,
  ): Promise<{ contentId: string; generationId: string; finalAssetUrl: string }> {
    const result = await apiRequest<{
      data: { contentId: string; generationId: string; finalAssetUrl: string };
    }>(
      `/campaigns/${encodeURIComponent(id)}/image`,
      { method: 'POST', body: JSON.stringify({ generationId }) },
      300000,
    );
    return {
      ...result.data,
      finalAssetUrl: result.data.finalAssetUrl.startsWith('/')
        ? apiUrl(result.data.finalAssetUrl)
        : result.data.finalAssetUrl,
    };
  },
  publications(id: string, page = 1, signal?: AbortSignal): Promise<ApiPage<StoredPublication>> {
    return apiRequest(`/campaigns/${encodeURIComponent(id)}/publications?page=${page}&limit=20`, {
      signal,
    });
  },
};
function resolveImages(campaign: StoredCampaign): StoredCampaign {
  const url = campaign.productImageUrl;
  const final = campaign.candidateContent?.finalAssetUrl;
  if (!url?.startsWith('/') && !final?.startsWith('/')) return campaign;
  return {
    ...campaign,
    ...(url?.startsWith('/') ? { productImageUrl: apiUrl(url) } : {}),
    ...(final?.startsWith('/') && campaign.candidateContent
      ? { candidateContent: { ...campaign.candidateContent, finalAssetUrl: apiUrl(final) } }
      : {}),
  };
}
