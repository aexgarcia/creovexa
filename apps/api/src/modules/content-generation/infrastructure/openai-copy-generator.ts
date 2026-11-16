import { setTimeout as delay } from 'node:timers/promises';
import type { OpenAICopyConfig } from '#app/config/openai.config';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';
import { CopyGenerationError, type CopyGenerator } from '../application/ports/copy-generator.js';
import {
  COPY_INSTRUCTIONS,
  HEADLINE_MAX_LENGTH,
  SUBHEADLINE_MAX_LENGTH,
  channelRules,
  copyBrief,
  validateCopy,
} from '../application/copy-policy.js';
interface CopyLogger {
  log(event: { event: string; attempt: number; code?: string }): void;
}
export class OpenAICopyGenerator implements CopyGenerator {
  constructor(
    private readonly config: OpenAICopyConfig,
    private readonly http: typeof fetch = fetch,
    private readonly logger: CopyLogger = { log() {} },
  ) {}
  assertAvailable() {
    if (!this.config.apiKey || !this.config.model) throw new CopyGenerationError('UNAVAILABLE');
  }
  async generate(input: GenerationSnapshotData) {
    this.assertAvailable();
    const properties = {
      headline: {
        type: 'string',
        description: `Main flyer text, at most ${HEADLINE_MAX_LENGTH} characters`,
      },
      subheadline: {
        type: 'string',
        description: `Supporting flyer line, at most ${SUBHEADLINE_MAX_LENGTH} characters, or an empty string`,
      },
      caption: {
        type: 'string',
        description:
          'Post caption. Include product.name exactly and every requiredPriceTexts entry verbatim.',
      },
      cta: { type: 'string', enum: [input.cta] },
      hashtags: {
        type: 'array',
        items: { type: 'string' },
        maxItems: channelRules(input).hashtags.max,
      },
    };
    for (let attempt = 1; attempt <= 2; attempt++) {
      let retryable = false;
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
            max_output_tokens: 6000,
            instructions: COPY_INSTRUCTIONS,
            input: JSON.stringify(copyBrief(input)),
            text: {
              format: {
                type: 'json_schema',
                name: 'campaign_copy',
                strict: true,
                schema: {
                  type: 'object',
                  properties,
                  required: Object.keys(properties),
                  additionalProperties: false,
                },
              },
            },
          }),
        });
        if (!response.ok) {
          retryable = response.status === 429 || response.status >= 500;
          await response.body?.cancel();
          throw new CopyGenerationError('UNAVAILABLE');
        }
        const raw = await response.text();
        if (raw.length > 100000) throw new CopyGenerationError('INVALID_OUTPUT');
        let result: unknown;
        try {
          result = JSON.parse(raw);
        } catch {
          throw new CopyGenerationError('INVALID_OUTPUT');
        }
        if (!result || typeof result !== 'object') throw new CopyGenerationError('INVALID_OUTPUT');
        const envelope = result as {
          status?: unknown;
          output?: { type?: string; content?: { type?: string; text?: string }[] }[];
        };
        if (envelope.status !== 'completed' || !Array.isArray(envelope.output))
          throw new CopyGenerationError('INVALID_OUTPUT');
        const content = envelope.output
          .filter((item) => item.type === 'message')
          .flatMap((item) => (Array.isArray(item.content) ? item.content : []));
        if (content.some((item) => item.type === 'refusal'))
          throw new CopyGenerationError('REFUSED');
        const texts = content.filter((item) => item.type === 'output_text');
        if (texts.length !== 1 || typeof texts[0]?.text !== 'string')
          throw new CopyGenerationError('INVALID_OUTPUT');
        let value: unknown;
        try {
          value = JSON.parse(texts[0].text);
        } catch {
          throw new CopyGenerationError('INVALID_OUTPUT');
        }
        const copy = validateCopy(value, input);
        this.logger.log({ event: 'copy_generated', attempt });
        return copy;
      } catch (error) {
        const safe =
          error instanceof CopyGenerationError
            ? error
            : new CopyGenerationError(
                error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
                  ? 'TIMEOUT'
                  : 'UNAVAILABLE',
              );
        if (!(error instanceof CopyGenerationError)) retryable = true;
        this.logger.log({ event: 'copy_generation_failed', attempt, code: safe.code });
        if (!retryable || attempt === 2) throw safe;
        await delay(500);
      }
    }
    throw new CopyGenerationError('UNAVAILABLE');
  }
}
