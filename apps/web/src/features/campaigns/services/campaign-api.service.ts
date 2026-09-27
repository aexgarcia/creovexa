import { apiRequest, type ApiPage } from '@/lib/api-client';
import type {
  CreateStoredCampaignInput,
  StoredCampaign,
  StoredPublication,
} from '../types/stored-campaign.types';
export const campaignApi = {
  list(page = 1, signal?: AbortSignal): Promise<ApiPage<StoredCampaign>> {
    return apiRequest(`/campaigns?page=${page}&limit=20`, { signal });
  },
  async get(id: string, signal?: AbortSignal): Promise<StoredCampaign> {
    return (
      await apiRequest<{ data: StoredCampaign }>(`/campaigns/${encodeURIComponent(id)}`, { signal })
    ).data;
  },
  async create(input: CreateStoredCampaignInput): Promise<StoredCampaign> {
    return (
      await apiRequest<{ data: StoredCampaign }>('/campaigns', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data;
  },
  async approve(id: string, contentId: string): Promise<StoredCampaign> {
    return (
      await apiRequest<{ data: StoredCampaign }>(`/campaigns/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ contentId }),
      })
    ).data;
  },
  publications(id: string, page = 1, signal?: AbortSignal): Promise<ApiPage<StoredPublication>> {
    return apiRequest(`/campaigns/${encodeURIComponent(id)}/publications?page=${page}&limit=20`, {
      signal,
    });
  },
};
