import { apiRequest } from '@/lib/api-client';
import type { GenerationJob } from '../types/generation-job';

export interface CampaignCopy {
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
}

// El trabajo del copy de la generación actual, y el copy cuando esté listo.
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
  // Solo pide el copy; la API responde de inmediato y lo genera en segundo plano.
  async generate(id: string) {
    return (
      await apiRequest<{ data: CampaignCopyStatus }>(
        '/campaigns/' + encodeURIComponent(id) + '/copy',
        { method: 'POST' },
      )
    ).data;
  },
};
