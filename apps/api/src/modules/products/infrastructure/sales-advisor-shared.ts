import { ProductSuggestionError } from '../application/errors/product-suggestion.error.js';
import {
  BENEFITS_MAX,
  BENEFIT_MAX_LENGTH,
  IDEAL_FOR_MAX_LENGTH,
} from '../domain/entities/product.js';

// Esquema de salida común a los proveedores de sugerencias.
export const SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    benefits: {
      type: 'array',
      items: { type: 'string', description: `At most ${BENEFIT_MAX_LENGTH} characters` },
      maxItems: BENEFITS_MAX,
    },
    idealFor: { type: 'string', description: `At most ${IDEAL_FOR_MAX_LENGTH} characters` },
  },
  required: ['benefits', 'idealFor'],
};

/** Convierte cualquier fallo en uno seguro, sin el mensaje ni el cuerpo del proveedor. */
export function suggestionFailure(error: unknown): ProductSuggestionError {
  if (error instanceof ProductSuggestionError) return error;
  return new ProductSuggestionError(
    error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
      ? 'TIMEOUT'
      : 'UNAVAILABLE',
  );
}
