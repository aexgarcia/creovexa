export type CampaignAssetFailure =
  | 'NOT_FOUND'
  | 'FINAL_REQUIRED'
  | 'UNAVAILABLE'
  | 'CORRUPTED'
  | 'TIMEOUT';

const messages: Record<CampaignAssetFailure, string> = {
  NOT_FOUND: 'No se encontró el flyer solicitado.',
  FINAL_REQUIRED: 'La campaña necesita un flyer final legible para aprobarse.',
  UNAVAILABLE: 'No se pudo acceder al flyer guardado.',
  CORRUPTED: 'El archivo guardado no supera la verificación de integridad.',
  TIMEOUT: 'La lectura del flyer guardado tardó demasiado.',
};

export class CampaignAssetError extends Error {
  constructor(readonly code: CampaignAssetFailure) {
    super(messages[code]);
    this.name = 'CampaignAssetError';
  }
}
