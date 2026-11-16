// Fallo al sugerir los datos de venta con IA (ADR-0031). Nunca expone la respuesta del proveedor.
export class ProductSuggestionError extends Error {
  constructor(readonly code: 'UNAVAILABLE' | 'TIMEOUT' | 'INVALID_OUTPUT' | 'REFUSED') {
    const messages = {
      UNAVAILABLE: 'Las sugerencias con IA no están disponibles en este momento.',
      TIMEOUT: 'La IA tardó demasiado en responder. Inténtalo de nuevo.',
      INVALID_OUTPUT: 'La IA no devolvió una sugerencia válida. Inténtalo de nuevo.',
      REFUSED: 'La IA no pudo sugerir datos para este producto.',
    };
    super(messages[code]);
    this.name = 'ProductSuggestionError';
  }
}
