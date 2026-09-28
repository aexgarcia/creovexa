import { applicationEnvironment } from './environment.js';
export interface OpenAICopyConfig {
  apiKey: string | null;
  model: string;
  timeoutMs: number;
}
export const OPENAI_COPY_CONFIG = Symbol('OPENAI_COPY_CONFIG');
export function readOpenAICopyConfig(env: NodeJS.ProcessEnv): OpenAICopyConfig {
  const apiKey = env.OPENAI_API_KEY?.trim() || null;
  const model = env.OPENAI_COPY_MODEL?.trim() || '';
  const timeoutMs = Number(env.OPENAI_COPY_TIMEOUT_MS ?? 20000);
  if (apiKey && !model) throw new Error('OPENAI_COPY_MODEL es obligatorio al configurar OpenAI.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 40000)
    throw new Error('OPENAI_COPY_TIMEOUT_MS debe estar entre 100 y 40000.');
  return { apiKey, model, timeoutMs };
}
export const openAICopyConfigProvider = {
  provide: OPENAI_COPY_CONFIG,
  useFactory: () => readOpenAICopyConfig(applicationEnvironment()),
};
