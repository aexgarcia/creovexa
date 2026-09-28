import { applicationEnvironment } from './environment.js';
import { readOpenAICopyConfig, type OpenAICopyConfig } from './openai.config.js';
export interface GeminiCopyConfig {
  apiKey: string | null;
  model: string;
  timeoutMs: number;
}
export type CopyGenerationConfig =
  | { provider: 'gemini'; settings: GeminiCopyConfig }
  | { provider: 'openai'; settings: OpenAICopyConfig };
export const COPY_GENERATION_CONFIG = Symbol('COPY_GENERATION_CONFIG');
export function readCopyGenerationConfig(env: NodeJS.ProcessEnv): CopyGenerationConfig {
  const provider = env.COPY_PROVIDER?.trim() || 'gemini';
  if (provider === 'openai') return { provider, settings: readOpenAICopyConfig(env) };
  if (provider !== 'gemini') throw new Error('COPY_PROVIDER debe ser gemini u openai.');
  const model = env.GEMINI_COPY_MODEL?.trim() || 'gemini-2.5-flash-lite';
  const timeoutMs = Number(env.GEMINI_COPY_TIMEOUT_MS ?? 20000);
  if (!/^gemini-[a-zA-Z0-9.-]{1,100}$/.test(model))
    throw new Error('GEMINI_COPY_MODEL debe ser un identificador de modelo Gemini.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 40000)
    throw new Error('GEMINI_COPY_TIMEOUT_MS debe estar entre 100 y 40000.');
  return { provider, settings: { apiKey: env.GEMINI_API_KEY?.trim() || null, model, timeoutMs } };
}
export const copyGenerationConfigProvider = {
  provide: COPY_GENERATION_CONFIG,
  useFactory: () => readCopyGenerationConfig(applicationEnvironment()),
};
