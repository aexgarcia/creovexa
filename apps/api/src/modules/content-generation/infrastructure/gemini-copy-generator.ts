import { setTimeout as delay } from 'node:timers/promises';
import type { GeminiCopyConfig } from '#app/config/copy-generation.config';
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
  log(event: { event: string; provider: string; attempt: number; code?: string }): void;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CopyGenerationError('INVALID_OUTPUT');
  return value as Record<string, unknown>;
}
function parseOutput(raw: string): unknown {
  if (raw.length > 100000) throw new CopyGenerationError('INVALID_OUTPUT');
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new CopyGenerationError('INVALID_OUTPUT');
  }
  const envelope = object(json);
  if (envelope.promptFeedback && object(envelope.promptFeedback).blockReason)
    throw new CopyGenerationError('REFUSED');
  if (!Array.isArray(envelope.candidates) || envelope.candidates.length !== 1)
    throw new CopyGenerationError('INVALID_OUTPUT');
  const candidate = object(envelope.candidates[0]);
  if (
    ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(
      String(candidate.finishReason),
    )
  )
    throw new CopyGenerationError('REFUSED');
  if (candidate.finishReason !== 'STOP') throw new CopyGenerationError('INVALID_OUTPUT');
  const parts = object(candidate.content).parts;
  if (!Array.isArray(parts) || !parts.length) throw new CopyGenerationError('INVALID_OUTPUT');
  const text = parts
    .map((part) => {
      const item = object(part);
      if (item.thought === true) return '';
      if (typeof item.text !== 'string') throw new CopyGenerationError('INVALID_OUTPUT');
      return item.text;
    })
    .join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new CopyGenerationError('INVALID_OUTPUT');
  }
}
export class GeminiCopyGenerator implements CopyGenerator {
  constructor(
    private readonly config: GeminiCopyConfig,
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
    const body = JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: COPY_INSTRUCTIONS,
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: JSON.stringify(copyBrief(input)),
            },
          ],
        },
      ],
      generationConfig: {
        candidateCount: 1,
        maxOutputTokens: 6000,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties,
          required: Object.keys(properties),
        },
      },
    });
    for (let attempt = 1; attempt <= 2; attempt++) {
      let retryable = false;
      try {
        const response = await this.http(
          'https://generativelanguage.googleapis.com/v1beta/models/' +
            encodeURIComponent(this.config.model) +
            ':generateContent',
          {
            method: 'POST',
            signal: AbortSignal.timeout(this.config.timeoutMs),
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.config.apiKey! },
            body,
          },
        );
        if (!response.ok) {
          retryable = response.status === 429 || response.status >= 500;
          await response.body?.cancel();
          throw new CopyGenerationError('UNAVAILABLE');
        }
        const content = validateCopy(parseOutput(await response.text()), input);
        this.logger.log({ event: 'copy_generated', provider: 'gemini', attempt });
        return content;
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
        this.logger.log({
          event: 'copy_generation_failed',
          provider: 'gemini',
          attempt,
          code: safe.code,
        });
        if (!retryable || attempt === 2) throw safe;
        await delay(500);
      }
    }
    throw new CopyGenerationError('UNAVAILABLE');
  }
}
