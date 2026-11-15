export type CampaignImageFailure =
  | 'NOT_FOUND'
  | 'FINAL_ASSET_REQUIRED'
  | 'COPY_REQUIRED'
  | 'PRODUCT_IMAGE_REQUIRED'
  | 'LOGO_UNAVAILABLE'
  | 'UNAVAILABLE'
  | 'UNSUPPORTED_DIMENSIONS'
  | 'INVALID_OUTPUT'
  | 'REFUSED'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'STALE_RESULT'
  | 'TIMEOUT'
  // AI_FULL: la lectura del flyer no coincide con el brief (ADR-0009).
  | 'VERIFICATION_FAILED';

export class CampaignImageError extends Error {
  constructor(readonly code: CampaignImageFailure) {
    super('No se pudo preparar la imagen de la campaña: ' + code + '.');
    this.name = 'CampaignImageError';
  }
}
