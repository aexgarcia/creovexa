import type {
  Publication,
  PublicationState,
} from '#app/modules/publications/domain/entities/publication';

export function publicationState(publication: Publication): PublicationState {
  return {
    id: publication.id,
    organizationId: publication.organizationId,
    campaignId: publication.campaignId,
    approvedContentId: publication.approvedContentId,
    socialAccountId: publication.socialAccountId,
    platform: publication.platform,
    status: publication.status,
    attempt: publication.attempt,
    externalPostId: publication.externalPostId,
    failureCode: publication.failureCode,
    publishedAt: publication.publishedAt?.getTime() ?? null,
    version: publication.version,
    createdAt: publication.createdAt.getTime(),
    updatedAt: publication.updatedAt.getTime(),
  };
}
