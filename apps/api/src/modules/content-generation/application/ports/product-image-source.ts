import type { EntityId } from '#app/domain/entity-id';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export interface LoadProductImageInput extends CampaignImageSelection {
  operationId: EntityId;
  productId: EntityId;
  imageAssetId: EntityId;
}

export interface ProductImageSource {
  assertAvailable(): void;
  // Lee la imagen exacta guardada en el snapshot, comprobando su dueño y su producto.
  // Devuelve una referencia privada y temporal a los mismos bytes; no la genera ni la reemplaza.
  load(input: LoadProductImageInput): Promise<ImageArtifact>;
}
