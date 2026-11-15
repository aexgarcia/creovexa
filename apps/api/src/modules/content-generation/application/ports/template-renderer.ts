import type { EntityId } from '#app/domain/entity-id';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import type { FlyerBrief } from '../flyer-brief.js';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');

// Compone el flyer final a partir de la imagen de la IA. Dos implementaciones, según el modo
// del despliegue (ADR-0009): COMPOSED dibuja textos, precios y logo con la plantilla HTML;
// AI_FULL solo pega el logo original sobre el flyer que dibujó la IA.
export interface RenderCampaignTemplateInput extends CampaignImageSelection {
  operationId: EntityId;
  // La imagen de la IA ya guardada, para quien la lee del storage.
  mainImage: EntityId;
  // La misma imagen como archivo temporal de esta operación.
  baseImage: ImageArtifact;
  copy: {
    headline: string;
    caption: string;
    cta: string;
    hashtags: readonly string[];
  };
  brief: FlyerBrief;
  // El logo elegido para el flyer (AI_FULL); COMPOSED lo resuelve por su cuenta.
  logo: ImageArtifact | null;
  // Producto, precio, fechas, CTA, logo y revisión inmutable de plantilla, como fuente de verdad.
  snapshot: GenerationSnapshotData;
}

export interface FlyerComposition {
  final: ImageArtifact;
  // Recorte de la imagen de la IA que el logo tapó, para revisar que no hubiera texto.
  areaUnderLogo: ImageArtifact | null;
  // Cómo quedó el logo: directo sobre el fondo o sobre un velo.
  logoPlacement: 'DIRECT' | 'VEIL' | null;
}

export interface TemplateRenderer {
  assertAvailable(): void;
  // Si puede componer un flyer de ese tamaño final.
  supports(size: { width: number; height: number }): boolean;
  // Resuelve solo archivos propios y plantillas de confianza; escapa los valores y bloquea la red.
  render(input: RenderCampaignTemplateInput): Promise<FlyerComposition>;
}
