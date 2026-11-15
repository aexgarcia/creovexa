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
  // Almacenamiento privado e inmutable, idempotente por dueño, generación, operación y propósito.
  // Valida los bytes reales, el MIME y las dimensiones; nunca confía solo en los metadatos de la referencia.
  store(input: StoreCampaignAssetInput): Promise<StoredCampaignAsset>;
}
