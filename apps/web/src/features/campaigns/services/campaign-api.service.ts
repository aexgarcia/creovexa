import { apiRequest, apiUrl, type ApiPage } from '@/lib/api-client';
import type {
  CreateStoredCampaignInput,
  StoredCampaign,
  StoredPublication,
} from '../types/stored-campaign.types';
import type { GenerationJob } from '../types/generation-job';

// The flyer job of the current generation, and the flyer once it is ready.
export interface CampaignImageStatus extends GenerationJob {
  contentId: string | null;
  finalAssetUrl: string | null;
}

function resolveImageStatus(status: CampaignImageStatus): CampaignImageStatus {
  return {
    ...status,
    finalAssetUrl: status.finalAssetUrl?.startsWith('/')
      ? apiUrl(status.finalAssetUrl)
      : status.finalAssetUrl,
  };
}

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
  // Only asks for the flyer; the API answers at once and composes it in the background.
  async generateImage(id: string, generationId: string): Promise<CampaignImageStatus> {
    const result = await apiRequest<{ data: CampaignImageStatus }>(
      `/campaigns/${encodeURIComponent(id)}/image`,
      { method: 'POST', body: JSON.stringify({ generationId }) },
    );
    return resolveImageStatus(result.data);
  },
  async imageStatus(id: string, signal?: AbortSignal): Promise<CampaignImageStatus | null> {
    const result = await apiRequest<{ data: CampaignImageStatus | null }>(
      `/campaigns/${encodeURIComponent(id)}/image`,
      { signal },
    );
    return result.data && resolveImageStatus(result.data);
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
