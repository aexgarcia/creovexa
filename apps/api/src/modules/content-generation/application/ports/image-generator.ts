import type { EntityId } from '#app/domain/entity-id';
import type { GenerationSnapshotData } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import type { CampaignCopy } from './copy-generator.js';
import type { CampaignImageSelection, ImageArtifact } from './image-artifact.js';

export const IMAGE_GENERATOR = Symbol('IMAGE_GENERATOR');

export interface GenerateImageInput extends CampaignImageSelection {
  operationId: EntityId;
  // Trusted private artifact loaded from the single product image pinned in the snapshot.
  referenceImage: ImageArtifact;
  imagePrompt: string;
  copy: Pick<CampaignCopy, 'headline' | 'caption' | 'cta' | 'hashtags'>;
  // Product, promotion, brand/logo reference and instructions are frozen for this generation.
  snapshot: GenerationSnapshotData;
}

export interface ImageGenerator {
  assertAvailable(): void;
  // Use visual AI with the supplied photo; preserve product identity and leave exact text
  // and logo composition to the renderer. Resolve only scoped references, never client URLs.
  // Bound provider calls and return failures explicitly; do not silently reuse the source photo.
  generate(input: GenerateImageInput): Promise<ImageArtifact>;
}
