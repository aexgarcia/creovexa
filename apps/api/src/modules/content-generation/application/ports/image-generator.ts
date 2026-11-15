import type { EntityId } from '#app/domain/entity-id';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import type { FlyerBrief } from '../flyer-brief.js';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const IMAGE_GENERATOR = Symbol('IMAGE_GENERATOR');

export interface GenerateImageInput extends CampaignImageSelection {
  operationId: EntityId;
  // Archivo privado de confianza, cargado desde la única imagen del producto fijada en el snapshot.
  referenceImage: ImageArtifact;
  // Titular del flyer, ya revisado por el usuario; solo orienta la escena.
  headline: string;
  // Brief del flyer completo, para AI_FULL; los generadores de COMPOSED no lo usan.
  brief: FlyerBrief;
  // Referencias de estilo de la plantilla, en el orden que nombra el prompt (AI_FULL).
  styleImages: ImageArtifact[];
  // Datos congelados para esta generación; COMPOSED envía solo baseImageContext.
  snapshot: GenerationSnapshotData;
}

export interface ImageGenerator {
  assertAvailable(): void;
  // Usa la IA visual con la foto recibida; conserva la identidad del producto y deja el texto exacto
  // y el logo al compositor. Resuelve solo referencias acotadas, nunca URLs del cliente.
  // Acota las llamadas al proveedor y devuelve los fallos explícitamente; no reutiliza en silencio la foto original.
  generate(input: GenerateImageInput): Promise<ImageArtifact>;
}
