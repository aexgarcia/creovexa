export class OrganizationLogoError extends Error {
  constructor(
    readonly code: 'INVALID_IMAGE' | 'TOO_LARGE' | 'UNAVAILABLE' | 'CONFLICT' | 'NOT_FOUND',
  ) {
    const messages = {
      INVALID_IMAGE: 'El logo debe ser una imagen PNG, JPEG o WebP válida.',
      TOO_LARGE: 'El logo supera el máximo de 10 MB.',
      UNAVAILABLE: 'El almacenamiento de logos no está disponible.',
      CONFLICT: 'La empresa cambió mientras se guardaba el logo. Actualiza y vuelve a intentarlo.',
      NOT_FOUND: 'No se encontró el logo de la empresa.',
    };
    super(messages[code]);
    this.name = 'OrganizationLogoError';
  }
}
