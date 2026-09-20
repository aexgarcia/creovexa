import type { Campaign } from '../domain/entities/campaign.js';
import type { GeneratedContent } from '../domain/entities/generated-content.js';

function contentResult(content: GeneratedContent) {
  return {
    id: content.id as string,
    generationId: content.generationId as string,
    revision: content.revision,
    headline: content.headline,
    caption: content.caption,
    cta: content.cta,
    hashtags: [...content.hashtags] as string[],
    assetIds: [...content.assetIds] as string[],
    snapshot: structuredClone(content.snapshot.data),
    createdAt: content.createdAt.toISOString(),
  };
}

export function campaignResult(campaign: Campaign) {
  const generation = campaign.generation;
  return {
    id: campaign.id as string,
    organizationId: campaign.organizationId as string,
    title: campaign.title,
    productId: campaign.productId as string,
    templateId: campaign.templateId as string,
    templateRevisionId: campaign.templateRevisionId as string,
    instructions: campaign.instructions,
    cta: campaign.cta,
    promotion: campaign.promotion ? { ...campaign.promotion.toSnapshot() } : null,
    status: campaign.status,
    generation: generation
      ? {
          id: generation.id as string,
          number: generation.number,
          requestedAt: new Date(generation.requestedAt).toISOString(),
          snapshot: structuredClone(generation.snapshot.data),
        }
      : null,
    candidateContent: campaign.candidateContent ? contentResult(campaign.candidateContent) : null,
    approvedContentId: campaign.approvedContentId as string | null,
    approvedSocialAccountIds: [...campaign.approvedSocialAccountIds] as string[],
    publications: (campaign.publicationProgress?.entries ?? []).map((entry) => ({
      publicationId: entry.publicationId as string,
      organizationId: entry.organizationId as string,
      campaignId: entry.campaignId as string,
      approvedContentId: entry.approvedContentId as string,
      socialAccountId: entry.socialAccountId as string,
      status: entry.status,
      version: entry.version,
    })),
    failureOrigin: campaign.failureOrigin,
    generationFailure: campaign.generationFailure,
    version: campaign.version,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export type CampaignResult = ReturnType<typeof campaignResult>;
