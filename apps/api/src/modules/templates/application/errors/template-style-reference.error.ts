export class TemplateStyleReferenceError extends Error {
  constructor(
    readonly code: 'INVALID_IMAGE' | 'TOO_LARGE' | 'UNAVAILABLE' | 'NOT_FOUND' | 'LIMIT',
  ) {
    const messages = {
      INVALID_IMAGE: 'La referencia debe ser una imagen PNG, JPEG o WebP válida.',
      TOO_LARGE: 'La referencia supera el máximo de 10 MB.',
      UNAVAILABLE: 'El almacenamiento de imágenes no está disponible.',
      NOT_FOUND: 'No se encontró la referencia de estilo.',
      LIMIT: 'La plantilla ya tiene 2 referencias de estilo. Quita una antes de subir otra.',
    };
    super(messages[code]);
    this.name = 'TemplateStyleReferenceError';
  }
}
