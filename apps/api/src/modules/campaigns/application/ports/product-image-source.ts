import type { EntityId } from '#app/domain/entity-id';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export interface LoadProductImageInput extends CampaignImageSelection {
  operationId: EntityId;
  productId: EntityId;
  imageAssetId: EntityId;
}

export interface ProductImageSource {
  assertAvailable(): void;
  // Read the exact saved image from the snapshot, checking its owner and product.
  // Return a private temporary reference to the same bytes; do not generate or replace it.
  load(input: LoadProductImageInput): Promise<ImageArtifact>;
}
