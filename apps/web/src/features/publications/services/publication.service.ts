import { apiRequest, type ApiPage } from '@/lib/api-client';
export interface PublicationSummary {
  id: string;
  campaignId: string;
  campaignTitle: string;
  platform: string;
  status: string;
  socialAccountId: string;
  failureCode: string | null;
  externalPostId: string | null;
  publishedAt: string | null;
  createdAt: string;
}
export interface PublicationAttemptSummary {
  id: string;
  number: number;
  startedAt: string;
  result: {
    status: string;
    failureCode: string | null;
    externalPostId: string | null;
    recordedAt: string;
  } | null;
}
export const publicationService = {
  findAll(page = 1, signal?: AbortSignal): Promise<ApiPage<PublicationSummary>> {
    return apiRequest(`/publications?page=${page}&limit=20`, { signal });
  },
  attempts(
    id: string,
    page = 1,
    signal?: AbortSignal,
  ): Promise<ApiPage<PublicationAttemptSummary>> {
    return apiRequest(`/publications/${encodeURIComponent(id)}/attempts?page=${page}&limit=20`, {
      signal,
    });
  },
};
