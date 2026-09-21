import { isDeepStrictEqual } from 'node:util';
import type { EntityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import {
  inPrismaTransaction,
  type PrismaSession,
} from '#app/infrastructure/persistence/prisma/prisma-session';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import {
  PersistenceConflictError,
  PersistenceScopeError,
} from '#app/infrastructure/persistence/persistence.errors';
import type { Publication } from '../../../domain/entities/publication.js';
import type { PublicationRepository } from '../../../domain/repositories/publication.repository.js';
import {
  ConcurrentPublicationModificationError,
  InvalidPublicationError,
  InvalidPublicationTransitionError,
} from '../../../domain/errors/publication.errors.js';
import { PublicationMapper, publicationRelations } from './publication.mapper.js';

export class PrismaPublicationRepository implements PublicationRepository {
  constructor(private readonly database: PrismaSession) {}

  findById(organizationId: EntityId, publicationId: EntityId): Promise<Publication | null> {
    return inPrismaTransaction(
      this.database,
      async (tx) => {
        const row = await tx.publication.findUnique({
          where: { organizationId_id: { organizationId, id: publicationId } },
          include: publicationRelations,
        });
        return row === null ? null : PublicationMapper.toDomain(row);
      },
      'RepeatableRead',
    );
  }

  listByCampaign(organizationId: EntityId, campaignId: EntityId): Promise<Publication[]> {
    return inPrismaTransaction(
      this.database,
      async (tx) => {
        const rows = await tx.publication.findMany({
          where: { organizationId, campaignId },
          include: publicationRelations,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        return rows.map(PublicationMapper.toDomain);
      },
      'RepeatableRead',
    );
  }

  async add(organizationId: EntityId, publication: Publication): Promise<void> {
    if (organizationId !== publication.organizationId) throw new PersistenceScopeError();
    if (publication.status !== PublicationStatus.PENDING || publication.version !== 0)
      throw new InvalidPublicationError('initialState');
    try {
      await this.database.publication.create({
        data: PublicationMapper.toPersistence(publication),
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async save(
    organizationId: EntityId,
    publication: Publication,
    expectedVersion: number,
  ): Promise<void> {
    if (organizationId !== publication.organizationId) throw new PersistenceScopeError();
    if (
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0 ||
      publication.version !== expectedVersion + 1
    )
      throw new InvalidPublicationError('version');
    try {
      await inPrismaTransaction(this.database, async (tx) => {
        const where = { organizationId, id: publication.id };
        const previous = await tx.publication.findUnique({
          where: { organizationId_id: where },
        });
        if (!previous || previous.version !== BigInt(expectedVersion))
          throw new ConcurrentPublicationModificationError();
        for (const key of [
          'campaignId',
          'approvedContentId',
          'socialAccountId',
          'platform',
        ] as const) {
          if (previous[key] !== publication[key]) throw new PersistenceConflictError();
        }
        if (
          previous.createdAt.getTime() !== publication.createdAt.getTime() ||
          publication.updatedAt < previous.updatedAt
        )
          throw new PersistenceConflictError();
        if (previous.status === PublicationStatus.PUBLISHED)
          throw new InvalidPublicationTransitionError();
        const row = PublicationMapper.toPersistence(publication);
        const updated = await tx.publication.updateMany({
          where: { ...where, version: BigInt(expectedVersion) },
          data: {
            status: row.status,
            currentAttemptId: row.currentAttemptId,
            externalPostId: row.externalPostId,
            failureCode: row.failureCode,
            publishedAt: row.publishedAt,
            version: row.version,
            updatedAt: row.updatedAt,
          },
        });
        if (updated.count !== 1) throw new ConcurrentPublicationModificationError();
        const attempt = PublicationMapper.attempt(publication);
        const previousAttempt =
          previous.currentAttemptId === null
            ? null
            : await tx.publicationAttempt.findUniqueOrThrow({
                where: { id: previous.currentAttemptId },
              });
        if (previous.currentAttemptId === attempt.id) {
          if (
            previous.status !== PublicationStatus.PUBLISHING ||
            publication.status === PublicationStatus.PUBLISHING
          )
            throw new InvalidPublicationTransitionError();
          if (!isDeepStrictEqual(previousAttempt, attempt)) throw new PersistenceConflictError();
          await tx.publicationAttemptResult.create({
            data: PublicationMapper.result(publication),
          });
        } else {
          if (
            ![PublicationStatus.PENDING, PublicationStatus.FAILED].includes(
              PublicationStatus[previous.status],
            ) ||
            publication.status !== PublicationStatus.PUBLISHING
          )
            throw new InvalidPublicationTransitionError();
          if (attempt.number !== (previousAttempt?.number ?? 0n) + 1n)
            throw new PersistenceConflictError();
          await tx.publicationAttempt.create({ data: attempt });
        }
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }
}
