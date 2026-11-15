import { apiRequest } from '@/lib/api-client';
import type { GenerationJob } from '../types/generation-job';

// Límites de la API para los textos del flyer.
export const HEADLINE_MAX_LENGTH = 45;
export const SUBHEADLINE_MAX_LENGTH = 70;

// headline y subheadline van al flyer; caption y hashtags, solo a la publicación.
export interface CampaignCopy {
  headline: string;
  subheadline: string | null;
  caption: string;
  cta: string;
  hashtags: string[];
}

export interface FlyerTextsInput {
  generationId: string;
  headline: string;
  subheadline: string | null;
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
  // Corrige titular y subtítulo antes de pedir la imagen.
  async updateFlyerTexts(id: string, input: FlyerTextsInput) {
    return (
      await apiRequest<{ data: CampaignCopyStatus }>(
        '/campaigns/' + encodeURIComponent(id) + '/copy',
        { method: 'PATCH', body: JSON.stringify(input) },
      )
    ).data;
  },
};
