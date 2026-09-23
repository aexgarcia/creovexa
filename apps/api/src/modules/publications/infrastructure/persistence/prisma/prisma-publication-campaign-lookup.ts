import type { EntityId } from '#app/domain/entity-id';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import type { PublicationCampaignLookup } from '../../../application/ports/publication-campaign-lookup.js';

export class PrismaPublicationCampaignLookup implements PublicationCampaignLookup {
  constructor(private readonly client: PrismaClient) {}
  async exists(organizationId: EntityId, campaignId: EntityId): Promise<boolean> {
    return (
      (await this.client.campaign.findUnique({
        where: { organizationId_id: { organizationId, id: campaignId } },
        select: { id: true },
      })) !== null
    );
  }
}
