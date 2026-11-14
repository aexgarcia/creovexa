import type { EntityId } from '#app/domain/entity-id';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const TEMPLATE_RENDERER = Symbol('TEMPLATE_RENDERER');

export interface RenderCampaignTemplateInput extends CampaignImageSelection {
  operationId: EntityId;
  // Campaign-owned visual to compose, regardless of whether it originated from visual AI.
  mainImage: EntityId;
  copy: {
    headline: string;
    caption: string;
    cta: string;
    hashtags: readonly string[];
  };
  // Authoritative product, price, dates, CTA, logo and immutable template revision.
  snapshot: GenerationSnapshotData;
}

export interface TemplateRenderer {
  assertAvailable(): void;
  // Resolve only owned assets and trusted templates; escape values and deny arbitrary network.
  render(input: RenderCampaignTemplateInput): Promise<ImageArtifact>;
}
