import type { EntityId } from '#app/domain/entity-id';
import type { CampaignImageSelection, ImageArtifact, ImageDimensions } from './image-artifact.js';

export type CampaignAssetPurpose = 'BASE_IMAGE' | 'FINAL_PIECE';

export interface StoredCampaignAsset extends CampaignImageSelection, ImageDimensions {
  id: EntityId;
  purpose: CampaignAssetPurpose;
  contentType: ImageArtifact['contentType'];
}

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
