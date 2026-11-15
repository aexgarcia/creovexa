export type { CampaignImageSelection } from '#app/modules/campaigns/contract';

export interface ImageDimensions {
  width: number;
  height: number;
}

// Una referencia opaca y temporal emitida por un adapter de confianza, nunca una URL del cliente.
export interface ImageArtifact extends ImageDimensions {
  reference: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
}
