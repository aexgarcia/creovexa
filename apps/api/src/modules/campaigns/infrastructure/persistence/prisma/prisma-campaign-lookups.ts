import type { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import type { CampaignLookups } from '../../../application/ports/campaign-lookups.js';

/** Queries implement the consumer's ports without importing other modules' entities. */
export class PrismaCampaignLookups implements CampaignLookups {
  constructor(private readonly database: PrismaService) {}

  readonly organizations: CampaignLookups['organizations'] = {
    findById: (id) =>
      this.database.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          brandTone: true,
          logoAssetId: true,
        },
      }),
  };
  readonly products: CampaignLookups['products'] = {
    findById: async (organizationId, id) => {
      const row = await this.database.product.findUnique({
        where: { organizationId_id: { organizationId, id } },
        select: {
          id: true,
          organizationId: true,
          name: true,
          description: true,
          amountMinor: true,
          currency: true,
          imageAssetIds: true,
        },
      });
      return row === null
        ? null
        : {
            id: row.id,
            organizationId: row.organizationId,
            name: row.name,
            description: row.description,
            regularPrice: { amountMinor: Number(row.amountMinor), currency: row.currency },
            imageAssetIds: row.imageAssetIds,
          };
    },
  };
  readonly templates: CampaignLookups['templates'] = {
    findRevision: async (organizationId, templateId, id) => {
      const row = await this.database.templateRevision.findUnique({
        where: { organizationId_templateId_id: { organizationId, templateId, id } },
      });
      return row === null
        ? null
        : {
            id: row.templateId,
            organizationId: row.organizationId,
            revisionId: row.id,
            revisionNumber: Number(row.number),
            width: row.width,
            height: row.height,
          };
    },
  };
}
