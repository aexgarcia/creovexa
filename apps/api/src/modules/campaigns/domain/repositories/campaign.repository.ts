import type { EntityId } from '#app/domain/entity-id';
import type { Pagination, Page } from '#app/domain/pagination';
import type { Campaign } from '../entities/campaign.js';

export interface CampaignRepository {
  list(organizationId: EntityId, pagination: Pagination): Promise<Page<Campaign>>;
  findById(organizationId: EntityId, campaignId: EntityId): Promise<Campaign | null>;
  add(organizationId: EntityId, campaign: Campaign): Promise<void>;
  save(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void>;
}
