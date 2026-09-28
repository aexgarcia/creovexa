import type { EntityId } from '#app/domain/entity-id';
import type { Page, Pagination } from '#app/domain/pagination';
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
export interface PublicationHistoryReader {
  list(organizationId: EntityId, window: Pagination): Promise<Page<PublicationSummary>>;
  attempts(
    organizationId: EntityId,
    publicationId: EntityId,
    window: Pagination,
  ): Promise<Page<PublicationAttemptSummary> | null>;
}
export class PublicationNotFoundError extends Error {
  constructor() {
    super('No se encontró la publicación.');
    this.name = 'PublicationNotFoundError';
  }
}
