import { applicationEnvironment } from './environment.js';
import { readCopyGenerationConfig, type CopyGenerationConfig } from './copy-generation.config.js';

// Sugerencia con IA de los datos de venta del producto (ADR-0031). Usa el mismo proveedor, modelo,
// esfuerzo, clave y tiempo límite que el copy; PRODUCT_SUGGESTIONS_ENABLED=false la apaga sin
// tocar la clave.
export interface ProductSuggestionsConfig {
  enabled: boolean;
  provider: CopyGenerationConfig;
}
export const PRODUCT_SUGGESTIONS_CONFIG = Symbol('PRODUCT_SUGGESTIONS_CONFIG');
export function readProductSuggestionsConfig(env: NodeJS.ProcessEnv): ProductSuggestionsConfig {
  const value = env.PRODUCT_SUGGESTIONS_ENABLED?.trim();
  if (value !== undefined && value !== '' && value !== 'true' && value !== 'false')
    throw new Error('PRODUCT_SUGGESTIONS_ENABLED debe ser true o false.');
  return { enabled: value !== 'false', provider: readCopyGenerationConfig(env) };
}
export const productSuggestionsConfigProvider = {
  provide: PRODUCT_SUGGESTIONS_CONFIG,
  useFactory: () => readProductSuggestionsConfig(applicationEnvironment()),
};
