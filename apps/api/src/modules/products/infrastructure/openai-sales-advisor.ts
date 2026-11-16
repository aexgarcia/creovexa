import type { OpenAICopyConfig } from '#app/config/openai.config';
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

// Sugerencia con la Responses API de OpenAI (ADR-0031). Un solo intento: el usuario espera en
// pantalla y puede volver a pulsar.
export class OpenAISalesAdvisor implements ProductSalesAdvisor {
  constructor(
    private readonly enabled: boolean,
    private readonly config: OpenAICopyConfig,
    private readonly http: typeof fetch = fetch,
    private readonly logger: SuggestionLogger = { log() {} },
  ) {}

  available(): boolean {
    return this.enabled && Boolean(this.config.apiKey && this.config.model);
  }

  async suggest(brief: SalesSuggestionBrief): Promise<unknown> {
    if (!this.available()) throw new ProductSuggestionError('UNAVAILABLE');
    try {
      const response = await this.http('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.timeoutMs),
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.config.apiKey,
        },
        body: JSON.stringify({
          model: this.config.model,
          ...(this.config.reasoningEffort
            ? { reasoning: { effort: this.config.reasoningEffort } }
            : {}),
          store: false,
          max_output_tokens: 4000,
          instructions: SALES_SUGGESTION_INSTRUCTIONS,
          input: JSON.stringify(brief),
          text: {
            format: {
              type: 'json_schema',
              name: 'product_sales_suggestion',
              strict: true,
              schema: { ...SUGGESTION_SCHEMA, additionalProperties: false },
            },
          },
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ProductSuggestionError('UNAVAILABLE');
      }
      const raw = await response.text();
      if (raw.length > 100000) throw new ProductSuggestionError('INVALID_OUTPUT');
      const envelope = parseJson(raw) as {
        status?: unknown;
        output?: { type?: string; content?: { type?: string; text?: string }[] }[];
      } | null;
      if (!envelope || envelope.status !== 'completed' || !Array.isArray(envelope.output))
        throw new ProductSuggestionError('INVALID_OUTPUT');
      const content = envelope.output
        .filter((item) => item.type === 'message')
        .flatMap((item) => (Array.isArray(item.content) ? item.content : []));
      if (content.some((item) => item.type === 'refusal'))
        throw new ProductSuggestionError('REFUSED');
      const texts = content.filter((item) => item.type === 'output_text');
      if (texts.length !== 1 || typeof texts[0]?.text !== 'string')
        throw new ProductSuggestionError('INVALID_OUTPUT');
      const value = parseJson(texts[0].text);
      this.logger.log({ event: 'product_suggestion_generated', provider: 'openai' });
      return value;
    } catch (error) {
      const safe = suggestionFailure(error);
      this.logger.log({ event: 'product_suggestion_failed', provider: 'openai', code: safe.code });
      throw safe;
    }
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ProductSuggestionError('INVALID_OUTPUT');
  }
}
