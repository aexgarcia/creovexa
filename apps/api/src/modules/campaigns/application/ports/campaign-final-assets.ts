import type { CampaignImageSelection } from './image-artifact.js';
import type { StoredCampaignAsset } from './storage-provider.js';
import type { EntityId } from '#app/domain/entity-id';
export const CAMPAIGN_FINAL_ASSETS = Symbol('CAMPAIGN_FINAL_ASSETS');
export interface CampaignFinalAssets {
  // Read only a verified final PNG owned by this campaign and generation.
  readFinal(
    input: CampaignImageSelection & { assetId: EntityId },
  ): Promise<{ bytes: Uint8Array; asset: StoredCampaignAsset } | null>;
}
