import { applicationEnvironment } from './environment.js';

export interface GeminiImageConfig {
  apiKey: string | null;
  model: string;
  timeoutMs: number;
}

// AI_FULL: la IA dibuja el flyer completo y el sistema pega el logo y lo verifica.
// COMPOSED: la IA genera una imagen base y Playwright compone los textos (ADR-0009).
export type ImageMode = 'AI_FULL' | 'COMPOSED';

export interface FlyerVisionConfig {
  model: string;
  timeoutMs: number;
}

export type ImageGenerationConfig =
  | { provider: 'disabled'; mode: ImageMode }
  | {
      provider: 'openai';
      mode: ImageMode;
      settings: OpenAIImageConfig;
      // Lectura que verifica el flyer de AI_FULL.
      vision: FlyerVisionConfig;
    }
  | { provider: 'gemini'; mode: 'COMPOSED'; settings: GeminiImageConfig };

export const IMAGE_GENERATION_CONFIG = Symbol('IMAGE_GENERATION_CONFIG');
export interface OpenAIImageConfig {
  apiKey: string | null;
  model: string;
  timeoutMs: number;
  quality: 'low' | 'medium' | 'high';
}

export function readImageGenerationConfig(env: NodeJS.ProcessEnv): ImageGenerationConfig {
  const provider = env.IMAGE_PROVIDER?.trim() || 'disabled';
  const requestedMode = env.IMAGE_MODE?.trim() || null;
  if (requestedMode !== null && !['AI_FULL', 'COMPOSED'].includes(requestedMode))
    throw new Error('IMAGE_MODE debe ser AI_FULL o COMPOSED.');
  // AI_FULL es el modo principal con OpenAI; Gemini solo tiene COMPOSED. Sin proveedor no hay
  // generación, y COMPOSED deja el compositor que ya se usaba.
  const mode = (requestedMode ?? (provider === 'openai' ? 'AI_FULL' : 'COMPOSED')) as ImageMode;
  // Una clave de API para copy nunca debe activar de forma implícita la generación de imágenes, que puede cobrarse.
  if (provider === 'disabled') return { provider, mode };
  if (provider === 'openai') {
    const model = env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2';
    if (!/^gpt-image-2(?:-\d{4}-\d{2}-\d{2})?$/.test(model))
      throw new Error('OPENAI_IMAGE_MODEL debe ser gpt-image-2 o su snapshot fechado.');
    const quality = env.OPENAI_IMAGE_QUALITY?.trim() || 'medium';
    if (!['low', 'medium', 'high'].includes(quality))
      throw new Error('OPENAI_IMAGE_QUALITY debe ser low, medium o high.');
    const timeoutMs = Number(env.OPENAI_IMAGE_TIMEOUT_MS ?? 120000);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000)
      throw new Error('OPENAI_IMAGE_TIMEOUT_MS debe estar entre 100 y 120000.');
    const visionModel = env.OPENAI_VISION_MODEL?.trim() || 'gpt-5-mini';
    if (!/^[a-zA-Z0-9.-]{1,100}$/.test(visionModel))
      throw new Error('OPENAI_VISION_MODEL debe ser un identificador de modelo.');
    const visionTimeoutMs = Number(env.OPENAI_VISION_TIMEOUT_MS ?? 60000);
    if (!Number.isInteger(visionTimeoutMs) || visionTimeoutMs < 100 || visionTimeoutMs > 90000)
      throw new Error('OPENAI_VISION_TIMEOUT_MS debe estar entre 100 y 90000.');
    return {
      provider,
      mode,
      settings: {
        apiKey: env.OPENAI_API_KEY?.trim() || null,
        model,
        quality: quality as OpenAIImageConfig['quality'],
        timeoutMs,
      },
      vision: { model: visionModel, timeoutMs: visionTimeoutMs },
    };
  }
  if (provider !== 'gemini') throw new Error('IMAGE_PROVIDER debe ser disabled, gemini u openai.');
  if (mode !== 'COMPOSED')
    throw new Error('IMAGE_MODE=AI_FULL requiere IMAGE_PROVIDER=openai; con Gemini usa COMPOSED.');
  const model = env.GEMINI_IMAGE_MODEL?.trim() || '';
  if (!/^gemini-[a-zA-Z0-9.-]{1,100}$/.test(model) || !model.includes('image'))
    throw new Error('GEMINI_IMAGE_MODEL debe ser un identificador de modelo Gemini de imagen.');
  const timeoutMs = Number(env.GEMINI_IMAGE_TIMEOUT_MS ?? 60000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000)
    throw new Error('GEMINI_IMAGE_TIMEOUT_MS debe estar entre 100 y 120000.');
  return {
    provider,
    mode,
    settings: { apiKey: env.GEMINI_API_KEY?.trim() || null, model, timeoutMs },
  };
}

export const imageGenerationConfigProvider = {
  provide: IMAGE_GENERATION_CONFIG,
  useFactory: () => readImageGenerationConfig(applicationEnvironment()),
};
