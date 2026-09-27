import type { EntityId } from '#app/domain/entity-id';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import type { DashboardReader, DashboardResult } from '../application/dashboard-reader.js';
export class PrismaDashboardReader implements DashboardReader {
  constructor(private readonly client: PrismaClient) {}
  read(organizationId: EntityId): Promise<DashboardResult> {
    return this.client.$transaction(
      async (tx) => {
        const where = { organizationId };
        const [products, templates, statuses, publications, recent] = await Promise.all([
          tx.product.count({ where }),
          tx.template.count({ where }),
          tx.campaign.groupBy({ by: ['status'], where, _count: { _all: true } }),
          tx.publication.groupBy({ by: ['platform', 'status'], where, _count: { _all: true } }),
          tx.campaign.findMany({
            where,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 5,
            select: { id: true, title: true, status: true, createdAt: true },
          }),
        ]);
        return {
          totals: {
            products,
            templates,
            campaigns: statuses.reduce((sum, row) => sum + row._count._all, 0),
            published: publications
              .filter((row) => row.status === 'PUBLISHED')
              .reduce((sum, row) => sum + row._count._all, 0),
            pendingApproval:
              statuses.find((row) => row.status === 'PENDING_APPROVAL')?._count._all ?? 0,
          },
          campaignsByStatus: statuses.map((row) => ({
            status: row.status,
            count: row._count._all,
          })),
          publicationsByPlatform: publications.map((row) => ({
            platform: row.platform,
            status: row.status,
            count: row._count._all,
          })),
          recentCampaigns: recent.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
          })),
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
