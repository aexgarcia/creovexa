import { applicationEnvironment } from './environment.js';

export interface GeminiImageConfig {
  apiKey: string | null;
  model: string;
  timeoutMs: number;
}

export type ImageGenerationConfig =
  | { provider: 'disabled' }
  | { provider: 'openai'; settings: OpenAIImageConfig }
  | { provider: 'gemini'; settings: GeminiImageConfig };

export const IMAGE_GENERATION_CONFIG = Symbol('IMAGE_GENERATION_CONFIG');
export interface OpenAIImageConfig {
  apiKey: string | null;
  model: string;
  timeoutMs: number;
  quality: 'low' | 'medium' | 'high';
}

export function readImageGenerationConfig(env: NodeJS.ProcessEnv): ImageGenerationConfig {
  const provider = env.IMAGE_PROVIDER?.trim() || 'disabled';
  // Una clave de API para copy nunca debe activar de forma implícita la generación de imágenes, que puede cobrarse.
  if (provider === 'disabled') return { provider };
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
    return {
      provider,
      settings: {
        apiKey: env.OPENAI_API_KEY?.trim() || null,
        model,
        quality: quality as OpenAIImageConfig['quality'],
        timeoutMs,
      },
    };
  }
  if (provider !== 'gemini') throw new Error('IMAGE_PROVIDER debe ser disabled, gemini u openai.');
  const model = env.GEMINI_IMAGE_MODEL?.trim() || '';
  if (!/^gemini-[a-zA-Z0-9.-]{1,100}$/.test(model) || !model.includes('image'))
    throw new Error('GEMINI_IMAGE_MODEL debe ser un identificador de modelo Gemini de imagen.');
  const timeoutMs = Number(env.GEMINI_IMAGE_TIMEOUT_MS ?? 60000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120000)
    throw new Error('GEMINI_IMAGE_TIMEOUT_MS debe estar entre 100 y 120000.');
  return { provider, settings: { apiKey: env.GEMINI_API_KEY?.trim() || null, model, timeoutMs } };
}

export const imageGenerationConfigProvider = {
  provide: IMAGE_GENERATION_CONFIG,
  useFactory: () => readImageGenerationConfig(applicationEnvironment()),
};
