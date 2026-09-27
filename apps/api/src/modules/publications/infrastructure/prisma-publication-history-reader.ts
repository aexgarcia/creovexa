import type { EntityId } from '#app/domain/entity-id';
import type { Pagination } from '#app/domain/pagination';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import type { PublicationHistoryReader } from '../application/publication-history-reader.js';
export class PrismaPublicationHistoryReader implements PublicationHistoryReader {
  constructor(private readonly client: PrismaClient) {}
  list(organizationId: EntityId, { page, limit }: Pagination) {
    return this.client.$transaction(
      async (tx) => {
        const where = { organizationId };
        const [rows, total] = await Promise.all([
          tx.publication.findMany({
            where,
            include: { campaign: { select: { title: true } } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
          }),
          tx.publication.count({ where }),
        ]);
        return {
          total,
          items: rows.map((row) => ({
            id: row.id,
            campaignId: row.campaignId,
            campaignTitle: row.campaign.title,
            platform: row.platform,
            status: row.status,
            socialAccountId: row.socialAccountId,
            failureCode: row.failureCode,
            externalPostId: row.externalPostId,
            publishedAt: row.publishedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
          })),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  attempts(organizationId: EntityId, publicationId: EntityId, { page, limit }: Pagination) {
    return this.client.$transaction(
      async (tx) => {
        if (
          !(await tx.publication.findUnique({
            where: { organizationId_id: { organizationId, id: publicationId } },
            select: { id: true },
          }))
        )
          return null;
        const where = { organizationId, publicationId };
        const [rows, total] = await Promise.all([
          tx.publicationAttempt.findMany({
            where,
            include: { result: true },
            orderBy: { number: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          tx.publicationAttempt.count({ where }),
        ]);
        return {
          total,
          items: rows.map((row) => ({
            id: row.id,
            number: Number(row.number),
            startedAt: row.startedAt.toISOString(),
            result: row.result
              ? {
                  status: row.result.status,
                  failureCode: row.result.failureCode,
                  externalPostId: row.result.externalPostId,
                  recordedAt: row.result.recordedAt.toISOString(),
                }
              : null,
          })),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
