import type { EntityId } from '#app/domain/entity-id';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const FLYER_STYLE_SOURCE = Symbol('FLYER_STYLE_SOURCE');

export interface LoadFlyerStyleInput extends CampaignImageSelection {
  operationId: EntityId;
  // La plantilla y la referencia congeladas en el snapshot.
  templateId: EntityId;
  assetId: EntityId;
}

// Flyers de ejemplo de la plantilla, que AI_FULL envía como referencia de estilo.
export interface FlyerStyleSource {
  load(input: LoadFlyerStyleInput): Promise<ImageArtifact>;
}
