export type ImageGenerationFailure =
  | 'COPY_REQUIRED'
  | 'PRODUCT_IMAGE_REQUIRED'
  | 'LOGO_UNAVAILABLE'
  | 'UNAVAILABLE'
  | 'UNSUPPORTED_DIMENSIONS'
  // El proveedor activo no ofrece la calidad pedida (ADR-0033).
  | 'UNSUPPORTED_QUALITY'
  | 'INVALID_OUTPUT'
  | 'REFUSED'
  | 'RATE_LIMITED'
  | 'BUSY'
  | 'STALE_RESULT'
  | 'TIMEOUT'
  // AI_FULL: la lectura del flyer no coincide con el brief (ADR-0009).
  | 'VERIFICATION_FAILED';

export class ImageGenerationError extends Error {
  constructor(readonly code: ImageGenerationFailure) {
    super('No se pudo preparar la imagen de la campaña: ' + code + '.');
    this.name = 'ImageGenerationError';
  }
}
