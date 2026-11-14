export class ProductImageError extends Error {
  constructor(
    readonly code: 'INVALID_IMAGE' | 'TOO_LARGE' | 'UNAVAILABLE' | 'CONFLICT' | 'NOT_FOUND',
  ) {
    const messages = {
      INVALID_IMAGE: 'El archivo debe ser una imagen PNG, JPEG o WebP válida.',
      TOO_LARGE: 'La imagen supera el máximo de 10 MB.',
      UNAVAILABLE: 'El almacenamiento de imágenes no está disponible.',
      CONFLICT:
        'El producto cambió mientras se guardaba la imagen. Actualiza y vuelve a intentarlo.',
      NOT_FOUND: 'No se encontró la imagen del producto o servicio.',
    };
    super(messages[code]);
    this.name = 'ProductImageError';
  }
}
