import type { EntityId } from '#app/domain/entity-id';

export interface CampaignImageSelection {
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

// An opaque, temporary reference issued by a trusted adapter, never a client URL.
export interface ImageArtifact extends ImageDimensions {
  reference: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
}
