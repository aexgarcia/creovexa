import type { ImageArtifact, ImageDimensions } from './image-artifact.js';
import type { FlyerDesignData } from '#app/domain/value-objects/flyer-design';
import type { RenderCampaignTemplateInput } from './template-renderer.js';

export const CAMPAIGN_RENDER_RESOURCES = Symbol('CAMPAIGN_RENDER_RESOURCES');

export interface RenderRasterImage extends ImageDimensions {
  bytes: Uint8Array;
  contentType: ImageArtifact['contentType'];
}

export interface CampaignRenderResources {
  assertAvailable(): void;
  // Resuelve la plantilla fijada y solo imágenes propias de esta misma operación.
  // Un logo referenciado pero ilegible debe fallar, en vez de desaparecer de la pieza final.
  load(input: RenderCampaignTemplateInput): Promise<{
    mainImage: RenderRasterImage;
    logo: RenderRasterImage | null;
    design: FlyerDesignData;
  }>;
}
