import type { EntityId } from '#app/domain/entity-id';

export interface PublicationCampaignLookup {
  exists(organizationId: EntityId, campaignId: EntityId): Promise<boolean>;
}
