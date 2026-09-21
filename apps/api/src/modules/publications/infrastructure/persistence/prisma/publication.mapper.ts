import { entityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import type {
  Prisma,
  Publication as PublicationRow,
  PublicationAttempt,
  PublicationAttemptResult,
} from '#app/infrastructure/persistence/prisma/generated/client';
import { Publication, PublicationFailureCode } from '../../../domain/entities/publication.js';
import { InvalidPublicationError } from '../../../domain/errors/publication.errors.js';
import { SocialPlatform } from '../../../domain/social-platform.js';

export const publicationRelations = {
  currentAttempt: { include: { result: true } },
} satisfies Prisma.PublicationInclude;
export type PublicationRecord = Prisma.PublicationGetPayload<{
  include: typeof publicationRelations;
}>;

export class PublicationMapper {
  static toDomain(row: PublicationRecord): Publication {
    const attempt = row.currentAttempt;
    const result = attempt?.result ?? null;
    const terminal = row.status === 'PUBLISHED' || row.status === 'FAILED';
    if (
      (attempt?.id ?? null) !== row.currentAttemptId ||
      (attempt &&
        (attempt.organizationId !== row.organizationId || attempt.publicationId !== row.id)) ||
      terminal !== (result !== null) ||
      (result &&
        (result.attemptId !== attempt?.id ||
          result.status !== row.status ||
          result.externalPostId !== row.externalPostId ||
          result.failureCode !== row.failureCode ||
          result.recordedAt.getTime() !== row.updatedAt.getTime()))
    )
      throw new InvalidPublicationError('storedReferences');
    return Publication.restore({
      id: entityId(row.id),
      organizationId: entityId(row.organizationId),
      campaignId: entityId(row.campaignId),
      approvedContentId: entityId(row.approvedContentId),
      socialAccountId: entityId(row.socialAccountId),
      platform: SocialPlatform[row.platform],
      status: PublicationStatus[row.status],
      attempt:
        attempt === null
          ? null
          : {
              id: entityId(attempt.id),
              number: Number(attempt.number),
              startedAt: attempt.startedAt.getTime(),
            },
      externalPostId: row.externalPostId,
      failureCode: row.failureCode === null ? null : PublicationFailureCode[row.failureCode],
      publishedAt: row.publishedAt?.getTime() ?? null,
      version: Number(row.version),
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    });
  }

  static toPersistence(publication: Publication): PublicationRow {
    return {
      id: publication.id,
      organizationId: publication.organizationId,
      campaignId: publication.campaignId,
      approvedContentId: publication.approvedContentId,
      socialAccountId: publication.socialAccountId,
      platform: publication.platform,
      status: publication.status,
      currentAttemptId: publication.attempt?.id ?? null,
      externalPostId: publication.externalPostId,
      failureCode: publication.failureCode,
      publishedAt: publication.publishedAt,
      version: BigInt(publication.version),
      createdAt: publication.createdAt,
      updatedAt: publication.updatedAt,
    };
  }

  static attempt(publication: Publication): PublicationAttempt {
    if (!publication.attempt) throw new InvalidPublicationError('attempt');
    return {
      id: publication.attempt.id,
      organizationId: publication.organizationId,
      publicationId: publication.id,
      number: BigInt(publication.attempt.number),
      startedAt: new Date(publication.attempt.startedAt),
    };
  }

  static result(publication: Publication): PublicationAttemptResult {
    if (
      !publication.attempt ||
      ![PublicationStatus.PUBLISHED, PublicationStatus.FAILED].includes(publication.status)
    )
      throw new InvalidPublicationError('result');
    return {
      attemptId: publication.attempt.id,
      status: publication.status,
      externalPostId: publication.externalPostId,
      failureCode: publication.failureCode,
      recordedAt: publication.updatedAt,
    };
  }
}
