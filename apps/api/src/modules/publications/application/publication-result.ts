import type { Publication } from '../domain/entities/publication.js';

export function publicationResult(publication: Publication) {
  return {
    id: publication.id as string,
    campaignId: publication.campaignId as string,
    approvedContentId: publication.approvedContentId as string,
    socialAccountId: publication.socialAccountId as string,
    platform: publication.platform,
    status: publication.status,
    attempt: publication.attempt
      ? {
          id: publication.attempt.id as string,
          number: publication.attempt.number,
          startedAt: new Date(publication.attempt.startedAt).toISOString(),
        }
      : null,
    externalPostId: publication.externalPostId,
    failureCode: publication.failureCode,
    publishedAt: publication.publishedAt?.toISOString() ?? null,
    version: publication.version,
    createdAt: publication.createdAt.toISOString(),
    updatedAt: publication.updatedAt.toISOString(),
  };
}
export type PublicationResult = ReturnType<typeof publicationResult>;
