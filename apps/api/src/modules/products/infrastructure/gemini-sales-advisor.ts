import type { GeminiCopyConfig } from '#app/config/copy-generation.config';
import { ProductSuggestionError } from '../application/errors/product-suggestion.error.js';
import type { ProductSalesAdvisor } from '../application/ports/product-sales-advisor.js';
import {
  SALES_SUGGESTION_INSTRUCTIONS,
  type SalesSuggestionBrief,
} from '../application/sales-suggestion-policy.js';
import { SUGGESTION_SCHEMA, suggestionFailure } from './sales-advisor-shared.js';

interface SuggestionLogger {
  log(event: { event: string; provider: string; code?: string }): void;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ProductSuggestionError('INVALID_OUTPUT');
  return value as Record<string, unknown>;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ProductSuggestionError('INVALID_OUTPUT');
  }
}

// Sugerencia con generateContent de Gemini (ADR-0031). Un solo intento.
export class GeminiSalesAdvisor implements ProductSalesAdvisor {
  constructor(
    private readonly enabled: boolean,
    private readonly config: GeminiCopyConfig,
    private readonly http: typeof fetch = fetch,
    private readonly logger: SuggestionLogger = { log() {} },
  ) {}

  available(): boolean {
    return this.enabled && Boolean(this.config.apiKey && this.config.model);
  }

  async suggest(brief: SalesSuggestionBrief): Promise<unknown> {
    if (!this.available()) throw new ProductSuggestionError('UNAVAILABLE');
    try {
      const response = await this.http(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
          encodeURIComponent(this.config.model) +
          ':generateContent',
        {
          method: 'POST',
          signal: AbortSignal.timeout(this.config.timeoutMs),
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.config.apiKey! },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SALES_SUGGESTION_INSTRUCTIONS }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(brief) }] }],
            generationConfig: {
              candidateCount: 1,
              maxOutputTokens: 4000,
              responseMimeType: 'application/json',
              responseSchema: SUGGESTION_SCHEMA,
            },
          }),
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProductSuggestionError('UNAVAILABLE');
      }
      const raw = await response.text();
      if (raw.length > 100000) throw new ProductSuggestionError('INVALID_OUTPUT');
      const envelope = object(parseJson(raw));
      if (envelope.promptFeedback && object(envelope.promptFeedback).blockReason)
        throw new ProductSuggestionError('REFUSED');
      if (!Array.isArray(envelope.candidates) || envelope.candidates.length !== 1)
        throw new ProductSuggestionError('INVALID_OUTPUT');
      const candidate = object(envelope.candidates[0]);
      if (
        ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(
          String(candidate.finishReason),
        )
      )
        throw new ProductSuggestionError('REFUSED');
      if (candidate.finishReason !== 'STOP') throw new ProductSuggestionError('INVALID_OUTPUT');
      const parts = object(candidate.content).parts;
      if (!Array.isArray(parts) || !parts.length)
        throw new ProductSuggestionError('INVALID_OUTPUT');
      const text = parts
        .map((part) => {
          const item = object(part);
          if (item.thought === true) return '';
          if (typeof item.text !== 'string') throw new ProductSuggestionError('INVALID_OUTPUT');
          return item.text;
        })
        .join('');
      const value = parseJson(text);
      this.logger.log({ event: 'product_suggestion_generated', provider: 'gemini' });
      return value;
    } catch (error) {
      const safe = suggestionFailure(error);
      this.logger.log({ event: 'product_suggestion_failed', provider: 'gemini', code: safe.code });
      throw safe;
    }
  }
}
