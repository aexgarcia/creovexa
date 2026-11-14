import { apiRequest } from '@/lib/api-client';
import type { GenerationJob } from '../types/generation-job';

export interface CampaignCopy {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
}

// The copy job of the current generation, and the copy once it is ready.
export interface CampaignCopyStatus extends GenerationJob {
  copy: CampaignCopy | null;
}

export const campaignCopyService = {
  async get(id: string, signal?: AbortSignal) {
    return (
      await apiRequest<{ data: CampaignCopyStatus | null }>(
        '/campaigns/' + encodeURIComponent(id) + '/copy',
        { signal },
      )
    ).data;
  },
  // Only asks for the copy; the API answers at once and generates it in the background.
  async generate(id: string) {
    return (
      await apiRequest<{ data: CampaignCopyStatus }>(
        '/campaigns/' + encodeURIComponent(id) + '/copy',
        { method: 'POST' },
      )
    ).data;
  },
};
