export type { CampaignImageSelection } from '#app/modules/campaigns/application/ports/campaign-final-assets';

export interface ImageDimensions {
  width: number;
  height: number;
}

// An opaque, temporary reference issued by a trusted adapter, never a client URL.
export interface ImageArtifact extends ImageDimensions {
  reference: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
}
