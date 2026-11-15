import { ImageGenerationError } from '#app/modules/content-generation/application/errors/image-generation.error';
import type { FlyerVisionConfig } from '#app/config/image-generation.config';

import {
  FLYER_TEXT_KINDS,
  type FlyerReading,
  type LogoAreaReview,
} from '../application/flyer-verification.js';
import type { FlyerReader, ReadFlyerInput } from '../application/ports/flyer-reader.js';
import { LocalImageArtifacts } from './local-image-artifacts.js';

// Lecturas de visión que verifican el flyer de AI_FULL, portadas de
// evaluation/flyer-quality/openai.mjs. Cada una cuesta menos de US$ 0.001.

const READ_INSTRUCTIONS =
  'You are a meticulous proofreader. Transcribe every piece of visible text in the advertising image EXACTLY as it is drawn, character by character: keep misspellings, missing or extra accents, wrong digits, odd spacing and punctuation. Never correct, complete or guess. If a character is unreadable, write ? in its place. One entry per visually separate text block, in reading order. Classify each block: product_name (the product or service name), headline (main headline), cta (call to action / button), regular_price (regular or crossed-out price), promotion_price (offer price), other_price (any other amount), validity (dates or validity), logo (text that belongs to the business logo), product_text (text printed on the product or its packaging), other. Also report whether a business logo is visible and its text.';

// En la primera prueba por API el logo tapó "Nuevo en" y la lectura del flyer completo no lo
// notó, porque el modelo completa las letras cortadas: por eso se revisa el recorte aparte.
const REVIEW_INSTRUCTIONS =
  'This is a crop of an advertising image. Report whether it contains any text, letters or parts of letters (even cut off at the edges), and transcribe them. Separately, report whether it contains any object, product, person, icon or graphic shape, as opposed to plain or softly blurred background, and name it.';

const READING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['texts', 'logo'],
  properties: {
    texts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'kind'],
        properties: {
          text: { type: 'string' },
          kind: { type: 'string', enum: [...FLYER_TEXT_KINDS] },
        },
      },
    },
    logo: {
      type: 'object',
      additionalProperties: false,
      required: ['visible', 'text'],
      properties: { visible: { type: 'boolean' }, text: { type: 'string' } },
    },
  },
};

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hasText', 'text', 'hasObject', 'object'],
  properties: {
    hasText: { type: 'boolean' },
    text: { type: 'string' },
    hasObject: { type: 'boolean' },
    object: { type: 'string' },
  },
};

const MAX_RESPONSE = 200_000;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ImageGenerationError('INVALID_OUTPUT');
  return value as Record<string, unknown>;
}

function reading(value: unknown): FlyerReading {
  const row = record(value);
  const logo = record(row.logo);
  if (
    !Array.isArray(row.texts) ||
    typeof logo.visible !== 'boolean' ||
    typeof logo.text !== 'string'
  )
    throw new ImageGenerationError('INVALID_OUTPUT');
  return {
    texts: row.texts.map((item) => {
      const text = record(item);
      if (
        typeof text.text !== 'string' ||
        !FLYER_TEXT_KINDS.includes(text.kind as (typeof FLYER_TEXT_KINDS)[number])
      )
        throw new ImageGenerationError('INVALID_OUTPUT');
      return { text: text.text, kind: text.kind as (typeof FLYER_TEXT_KINDS)[number] };
    }),
    logo: { visible: logo.visible, text: logo.text },
  };
}

function review(value: unknown): LogoAreaReview {
  const row = record(value);
  if (
    typeof row.hasText !== 'boolean' ||
    typeof row.text !== 'string' ||
    typeof row.hasObject !== 'boolean' ||
    typeof row.object !== 'string'
  )
    throw new ImageGenerationError('INVALID_OUTPUT');
  return { hasText: row.hasText, text: row.text, hasObject: row.hasObject, object: row.object };
}

export class OpenAIFlyerReader implements FlyerReader {
  constructor(
    private readonly apiKey: string | null,
    private readonly config: FlyerVisionConfig,
    private readonly artifacts: LocalImageArtifacts,
    private readonly http: typeof fetch = fetch,
  ) {}

  assertAvailable(): void {
    if (!this.apiKey || !this.config.model) throw new ImageGenerationError('UNAVAILABLE');
  }

  async read(input: ReadFlyerInput): Promise<FlyerReading> {
    return reading(await this.ask(input, READ_INSTRUCTIONS, 'flyer_reading', READING_SCHEMA, 8000));
  }

  async reviewLogoArea(input: ReadFlyerInput): Promise<LogoAreaReview> {
    return review(await this.ask(input, REVIEW_INSTRUCTIONS, 'logo_area', REVIEW_SCHEMA, 2000));
  }

  // Una sola llamada, sin reintento: un fallo deja la imagen fallida y se puede pedir de nuevo.
  private async ask(
    input: ReadFlyerInput,
    instructions: string,
    name: string,
    schema: object,
    maxOutputTokens: number,
  ): Promise<unknown> {
    this.assertAvailable();
    try {
      const bytes = await this.artifacts.read({ ...input, source: input.image });
      const response = await this.http('https://api.openai.com/v1/responses', {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(this.config.timeoutMs),
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.apiKey },
        body: JSON.stringify({
          model: this.config.model,
          store: false,
          reasoning: { effort: 'low' },
          max_output_tokens: maxOutputTokens,
          instructions,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_image',
                  image_url: `data:${input.image.contentType};base64,${bytes.toString('base64')}`,
                  detail: 'high',
                },
              ],
            },
          ],
          text: { format: { type: 'json_schema', name, strict: true, schema } },
        }),
      });
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new ImageGenerationError(response.status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE');
      }
      const raw = await response.text();
      if (raw.length > MAX_RESPONSE) throw new ImageGenerationError('INVALID_OUTPUT');
      let envelope: Record<string, unknown>;
      try {
        envelope = record(JSON.parse(raw));
      } catch {
        throw new ImageGenerationError('INVALID_OUTPUT');
      }
      if (envelope.status !== 'completed' || !Array.isArray(envelope.output))
        throw new ImageGenerationError('INVALID_OUTPUT');
      const content = (envelope.output as { type?: string; content?: unknown }[])
        .filter((item) => item?.type === 'message')
        .flatMap((item) =>
          Array.isArray(item.content) ? (item.content as { type?: string; text?: unknown }[]) : [],
        );
      if (content.some((item) => item.type === 'refusal'))
        throw new ImageGenerationError('REFUSED');
      const texts = content.filter((item) => item.type === 'output_text');
      if (texts.length !== 1 || typeof texts[0]!.text !== 'string')
        throw new ImageGenerationError('INVALID_OUTPUT');
      try {
        return JSON.parse(texts[0]!.text);
      } catch {
        throw new ImageGenerationError('INVALID_OUTPUT');
      }
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error;
      throw new ImageGenerationError(
        error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
          ? 'TIMEOUT'
          : 'UNAVAILABLE',
      );
    }
  }
}
