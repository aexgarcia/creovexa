import type { SalesSuggestionBrief } from '../sales-suggestion-policy.js';

export const PRODUCT_SALES_ADVISOR = Symbol('PRODUCT_SALES_ADVISOR');

// Proveedor de IA que propone beneficios y «para quién es» (ADR-0031). Devuelve la respuesta del
// modelo sin normalizar; el caso de uso la valida con los límites del producto.
export interface ProductSalesAdvisor {
  // false si el despliegue no la habilita o falta la clave; no hace llamadas.
  available(): boolean;
  suggest(brief: SalesSuggestionBrief): Promise<unknown>;
}
