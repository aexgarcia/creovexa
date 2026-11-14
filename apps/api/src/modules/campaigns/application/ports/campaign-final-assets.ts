import type { EntityId } from '#app/domain/entity-id';

export const CAMPAIGN_FINAL_ASSETS = Symbol('CAMPAIGN_FINAL_ASSETS');

// Identifies one generation of one campaign inside its organization.
export interface CampaignImageSelection {
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
}

export type CampaignAssetPurpose = 'BASE_IMAGE' | 'FINAL_PIECE';

export interface StoredCampaignAsset extends CampaignImageSelection {
  id: EntityId;
  purpose: CampaignAssetPurpose;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
}

export interface CampaignFinalAssets {
  // Read only a verified final PNG owned by this campaign and generation.
  readFinal(
    input: CampaignImageSelection & { assetId: EntityId },
  ): Promise<{ bytes: Uint8Array; asset: StoredCampaignAsset } | null>;
}
