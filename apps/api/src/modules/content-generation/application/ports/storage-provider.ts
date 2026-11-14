import type { EntityId } from '#app/domain/entity-id';
import type { CampaignAssetPurpose, StoredCampaignAsset } from '#app/modules/campaigns/contract';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export type { CampaignAssetPurpose, StoredCampaignAsset };

export interface StoreCampaignAssetInput extends CampaignImageSelection {
  operationId: EntityId;
  purpose: CampaignAssetPurpose;
  source: ImageArtifact;
}

export interface StorageProvider {
  assertAvailable(): void;
  // Private immutable storage, idempotent per owner/generation/operation/purpose.
  // Validate actual bytes, MIME and dimensions; never trust reference metadata alone.
  store(input: StoreCampaignAssetInput): Promise<StoredCampaignAsset>;
}
