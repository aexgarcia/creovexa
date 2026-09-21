import type { Campaign, CampaignState } from '#app/modules/campaigns/domain/entities/campaign';

export function campaignState(campaign: Campaign): CampaignState {
  return {
    id: campaign.id,
    organizationId: campaign.organizationId,
    title: campaign.title,
    productId: campaign.productId,
    templateId: campaign.templateId,
    templateRevisionId: campaign.templateRevisionId,
    instructions: campaign.instructions,
    cta: campaign.cta,
    promotion: campaign.promotion,
    status: campaign.status,
    generation: campaign.generation,
    candidateContent: campaign.candidateContent,
    approvedContentId: campaign.approvedContentId,
    approvedSocialAccountIds: campaign.approvedSocialAccountIds,
    publicationProgress: campaign.publicationProgress,
    failureOrigin: campaign.failureOrigin,
    generationFailure: campaign.generationFailure,
    version: campaign.version,
    createdAt: campaign.createdAt.getTime(),
    updatedAt: campaign.updatedAt.getTime(),
  };
}
