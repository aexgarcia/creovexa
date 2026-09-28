import { apiRequest } from '@/lib/api-client';
export interface CampaignCopy {
  generationId: string;
  headline: string;
  caption: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
}
export const campaignCopyService = {
  async get(id: string, signal?: AbortSignal) {
    return (
      await apiRequest<{ data: CampaignCopy | null }>(
        '/campaigns/' + encodeURIComponent(id) + '/copy',
        { signal },
      )
    ).data;
  },
  async generate(id: string) {
    return (
      await apiRequest<{ data: CampaignCopy }>(
        '/campaigns/' + encodeURIComponent(id) + '/copy',
        { method: 'POST' },
        100000,
      )
    ).data;
  },
};
