import type { EntityId } from '#app/domain/entity-id';
import type { Campaign } from '../../domain/entities/campaign.js';
import type { CampaignImageSelection } from './image-artifact.js';
import type { StoredCampaignAsset } from './storage-provider.js';

export interface CampaignImageLease extends CampaignImageSelection {
  token: EntityId;
  expectedVersion: number;
  now: Date;
  expiresAt: Date;
}

export interface CampaignImageCompletion {
  campaign: Campaign;
  baseAsset: StoredCampaignAsset;
  finalAsset: StoredCampaignAsset;
}

export interface CampaignImageRepository {
  // Atomically reserve only the current GENERATING revision with persisted copy.
  // Reject an active reservation; allow reclaiming an expired one with a new token.
  claim(lease: CampaignImageLease): Promise<boolean>;
  // In one transaction: verify token, expiry at commit, version, owner and current generation;
  // verify stored asset metadata; persist GeneratedContent, PENDING_APPROVAL and completed reservation.
  // Never permit an older worker to commit after its lease was reclaimed.
  complete(lease: CampaignImageLease, result: CampaignImageCompletion, at: Date): Promise<void>;
  // Only release this token's active reservation. Already-completed work is a no-op.
  release(lease: CampaignImageLease): Promise<void>;
}
