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
  // Resolve the pinned template and only owned raster assets from this exact operation.
  // A referenced but unreadable logo must fail, rather than disappear from the final piece.
  load(input: RenderCampaignTemplateInput): Promise<{
    mainImage: RenderRasterImage;
    logo: RenderRasterImage | null;
    design: FlyerDesignData;
  }>;
}
