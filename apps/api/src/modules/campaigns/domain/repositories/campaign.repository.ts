import type { EntityId } from '#app/domain/entity-id';
import type { Pagination, Page } from '#app/domain/pagination';
import type { Campaign } from '../entities/campaign.js';

export interface CampaignRepository {
  list(organizationId: EntityId, pagination: Pagination): Promise<Page<Campaign>>;
  findById(organizationId: EntityId, campaignId: EntityId): Promise<Campaign | null>;
  /** Insert only, enforcing ownership and unique campaign identity. */
  add(organizationId: EntityId, campaign: Campaign): Promise<void>;
  /**
   * Atomically update the scoped campaign only if its stored version matches expectedVersion,
   * otherwise throw ConcurrentCampaignModificationError. Persist newly accepted generation/content
   * with this write; retain historical entries, never overwrite them or upsert a missing campaign.
   * Enforce unique generation IDs, content IDs and one content per campaign generation.
   */
  save(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void>;
}
