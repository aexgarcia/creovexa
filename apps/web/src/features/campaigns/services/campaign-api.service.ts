import { apiRequest, apiUrl, type ApiPage } from '@/lib/api-client';
import type {
  CampaignVersion,
  CreateStoredCampaignInput,
  StoredCampaign,
  UpdateStoredCampaignInput,
  StoredPublication,
} from '../types/stored-campaign.types';
import type { GenerationJob } from '../types/generation-job';
import type { CampaignCopyStatus } from './campaign-copy.service';

// El trabajo del flyer de la generación actual, y el flyer cuando esté listo.
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
  async update(id: string, input: UpdateStoredCampaignInput): Promise<StoredCampaign> {
    return resolveImages(
      (
        await apiRequest<{ data: StoredCampaign }>(`/campaigns/${encodeURIComponent(id)}`, {
          method: 'PATCH',
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
  // Solo pide el flyer; la API responde de inmediato y lo compone en segundo plano.
  // quality: LOW por defecto; MEDIUM consume 3 flyers del plan (ADR-0033).
  async generateImage(
    id: string,
    generationId: string,
    quality: 'LOW' | 'MEDIUM' = 'LOW',
  ): Promise<CampaignImageStatus> {
    const result = await apiRequest<{ data: CampaignImageStatus }>(
      `/campaigns/${encodeURIComponent(id)}/image`,
      { method: 'POST', body: JSON.stringify({ generationId, quality }) },
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
  // Empieza otra versión del flyer. Si los textos anteriores siguen valiendo, vuelven READY.
  async regenerate(id: string): Promise<CampaignCopyStatus> {
    return (
      await apiRequest<{ data: CampaignCopyStatus }>(
        `/campaigns/${encodeURIComponent(id)}/regenerate`,
        { method: 'POST' },
      )
    ).data;
  },
  async versions(id: string, signal?: AbortSignal): Promise<CampaignVersion[]> {
    const result = await apiRequest<{ data: CampaignVersion[] }>(
      `/campaigns/${encodeURIComponent(id)}/versions`,
      { signal },
    );
    return result.data.map((version) => ({
      ...version,
      content: version.content && {
        ...version.content,
        finalAssetUrl: version.content.finalAssetUrl?.startsWith('/')
          ? apiUrl(version.content.finalAssetUrl)
          : version.content.finalAssetUrl,
      },
    }));
  },
  // Vuelve a una versión anterior; queda pendiente de aprobación.
  async restoreVersion(
    id: string,
    generationId: string,
    expectedVersion: number,
  ): Promise<StoredCampaign> {
    return resolveImages(
      (
        await apiRequest<{ data: StoredCampaign }>(
          `/campaigns/${encodeURIComponent(id)}/versions/${encodeURIComponent(generationId)}/restore`,
          { method: 'POST', body: JSON.stringify({ expectedVersion }) },
        )
      ).data,
    );
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
