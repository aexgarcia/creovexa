import type { CampaignImageSelection } from '#app/modules/campaigns/contract';
export type { CampaignImageSelection };

export interface ImageDimensions {
  width: number;
  height: number;
}

// Archivos temporales de una operación de imagen. Se descartan al terminarla, salga bien o mal.
export interface TemporaryArtifacts {
  discard(scope: CampaignImageSelection & { operationId: string }): Promise<void>;
}

// Una referencia opaca y temporal emitida por un adapter de confianza, nunca una URL del cliente.
export interface ImageArtifact extends ImageDimensions {
  reference: string;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
}
