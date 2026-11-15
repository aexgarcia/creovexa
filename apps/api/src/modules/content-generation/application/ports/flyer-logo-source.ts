import type { EntityId } from '#app/domain/entity-id';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const FLYER_LOGO_SOURCE = Symbol('FLYER_LOGO_SOURCE');

export interface LoadFlyerLogoInput extends CampaignImageSelection {
  operationId: EntityId;
  // Un logo congelado en el snapshot: el principal o su variante clara.
  assetId: EntityId;
}

export interface FlyerLogoSource {
  assertAvailable(): void;
  // Copia el logo a un archivo temporal de esta operación. Un logo ilegible falla con
  // LOGO_UNAVAILABLE, en vez de desaparecer del flyer.
  load(input: LoadFlyerLogoInput): Promise<ImageArtifact>;
}
