import {
  BENEFITS_MAX,
  BENEFIT_MAX_LENGTH,
  IDEAL_FOR_MAX_LENGTH,
} from '../domain/entities/product.js';
import { ProductSuggestionError } from './errors/product-suggestion.error.js';

// Datos del formulario y de la marca que recibe el modelo. Sin IDs ni precios: la sugerencia no
// debe prometer nada comercial.
export interface SalesSuggestionBrief {
  region: { country: string; locale: string };
  business: {
    name: string;
    description: string | null;
    industry: string | null;
    brandTone: string | null;
    audience: string | null;
  };
  product: {
    kind: string;
    name: string;
    productBrand: string | null;
    description: string | null;
    keyAttributes: string[];
    unit: string | null;
  };
}

export interface SalesSuggestion {
  benefits: string[];
  idealFor: string | null;
}

// Instrucción común a los proveedores.
export const SALES_SUGGESTION_INSTRUCTIONS = [
  'You help a small business in Latin America describe what it sells. Write in the Spanish of region.locale (for es-PE: natural Peruvian Spanish). Address nobody: write benefits as short statements.',
  '',
  'Return:',
  `- benefits: three to ${BENEFITS_MAX} benefits for the buyer, each at most ${BENEFIT_MAX_LENGTH} characters, ordered from most to least compelling. A benefit is what the person gains in a concrete situation of their day, not the spec (for example "Reaccionas antes en shooters gracias a los 144 Hz", not "Frecuencia de 144 Hz"). Mention the spec only as proof when it helps.`,
  `- idealFor: who buys this and for what, in one sentence of at most ${IDEAL_FOR_MAX_LENGTH} characters. Use business.audience when it fits this product.`,
  '',
  'RULES:',
  '- Deduce everything from product and business only. Never invent prices, discounts, shipping, stock, guarantees, certifications, awards, health claims or numbers that are not in the facts.',
  '- If a benefit would need a fact you do not have, leave it out. Fewer, true benefits are better than more.',
  '- No superlatives ("el mejor", "increíble"), no hashtags, no emojis.',
  '- For a SERVICE, benefits are about the result and the experience of the client.',
].join('\n');

/** Lo que vuelve del modelo, recortado y validado con los límites del producto (ADR-0029). */
export function normalizeSuggestion(value: unknown): SalesSuggestion {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ProductSuggestionError('INVALID_OUTPUT');
  const raw = value as { benefits?: unknown; idealFor?: unknown };
  if (!Array.isArray(raw.benefits)) throw new ProductSuggestionError('INVALID_OUTPUT');
  const seen = new Set<string>();
  const benefits: string[] = [];
  for (const item of raw.benefits) {
    if (typeof item !== 'string') continue;
    const text = item.trim().replace(/\s+/g, ' ');
    const key = text.toLocaleLowerCase('es');
    // Uno demasiado largo se descarta: cortarlo dejaría una frase incompleta.
    if (!text || text.length > BENEFIT_MAX_LENGTH || seen.has(key)) continue;
    seen.add(key);
    benefits.push(text);
    if (benefits.length === BENEFITS_MAX) break;
  }
  if (!benefits.length) throw new ProductSuggestionError('INVALID_OUTPUT');
  const ideal = typeof raw.idealFor === 'string' ? raw.idealFor.trim().replace(/\s+/g, ' ') : '';
  return {
    benefits,
    idealFor: ideal && ideal.length <= IDEAL_FOR_MAX_LENGTH ? ideal : null,
  };
}
