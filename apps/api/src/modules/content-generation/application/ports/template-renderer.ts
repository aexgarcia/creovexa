import type { EntityId } from '#app/domain/entity-id';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');

export interface RenderCampaignTemplateInput extends CampaignImageSelection {
  operationId: EntityId;
  // Imagen de la campaña que se compone, venga o no de la IA visual.
  mainImage: EntityId;
  copy: {
    headline: string;
    caption: string;
    cta: string;
    hashtags: readonly string[];
  };
  // Producto, precio, fechas, CTA, logo y revisión inmutable de plantilla, como fuente de verdad.
  snapshot: GenerationSnapshotData;
}

export interface TemplateRenderer {
  assertAvailable(): void;
  // Resuelve solo archivos propios y plantillas de confianza; escapa los valores y bloquea la red.
  render(input: RenderCampaignTemplateInput): Promise<ImageArtifact>;
}
