import type { EntityId } from '#app/domain/entity-id';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import type { CampaignCopy } from './copy-generator.js';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const IMAGE_GENERATOR = Symbol('IMAGE_GENERATOR');

export interface GenerateImageInput extends CampaignImageSelection {
  operationId: EntityId;
  // Archivo privado de confianza, cargado desde la única imagen del producto fijada en el snapshot.
  referenceImage: ImageArtifact;
  imagePrompt: string;
  copy: Pick<CampaignCopy, 'headline' | 'caption' | 'cta' | 'hashtags'>;
  // Producto, promoción, referencia de marca y logo, e instrucciones quedan congelados para esta generación.
  snapshot: GenerationSnapshotData;
}

export interface ImageGenerator {
  assertAvailable(): void;
  // Usa la IA visual con la foto recibida; conserva la identidad del producto y deja el texto exacto
  // y el logo al compositor. Resuelve solo referencias acotadas, nunca URLs del cliente.
  // Acota las llamadas al proveedor y devuelve los fallos explícitamente; no reutiliza en silencio la foto original.
  generate(input: GenerateImageInput): Promise<ImageArtifact>;
}
