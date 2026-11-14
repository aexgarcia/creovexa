import type { EntityId } from '#app/domain/entity-id';
import type { GeneratedCampaignContent } from '#app/modules/campaigns/contract';
import type { CampaignImageSelection } from './image-artifact.js';
import type { StoredCampaignAsset } from './storage-provider.js';

export interface CampaignImageLease extends CampaignImageSelection {
  token: EntityId;
  expectedVersion: number;
  now: Date;
  expiresAt: Date;
}

export interface CampaignImageCompletion {
  // Exactly the persisted copy; campaigns turns it into the content awaiting approval.
  copy: { headline: string; caption: string; cta: string; hashtags: readonly string[] };
  baseAsset: StoredCampaignAsset;
  finalAsset: StoredCampaignAsset;
}

export interface CampaignImageRepository {
  // Atomically reserve only the current GENERATING revision with persisted copy.
  // Reject an active reservation; allow reclaiming an expired one with a new token.
  claim(lease: CampaignImageLease): Promise<boolean>;
  // In one transaction: verify token, expiry at commit, version, owner and current generation;
  // verify stored asset metadata; have campaigns record the content and PENDING_APPROVAL; close the reservation.
  // Never permit an older worker to commit after its lease was reclaimed.
  complete(
    lease: CampaignImageLease,
    result: CampaignImageCompletion,
    at: Date,
  ): Promise<GeneratedCampaignContent>;
  // Only release this token's active reservation. Already-completed work is a no-op.
  release(lease: CampaignImageLease): Promise<void>;
}
