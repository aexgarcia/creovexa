import { applicationEnvironment } from './environment.js';
// Valores de `reasoning.effort` de la Responses API. Cada modelo acepta solo algunos (gpt-6-luna no
// acepta minimal); si el modelo rechaza el valor, la llamada falla y el copy queda en FAILED.
export const REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
export interface OpenAICopyConfig {
  apiKey: string | null;
  model: string;
  // null: no se envía y el modelo usa su esfuerzo por defecto.
  reasoningEffort: ReasoningEffort | null;
  timeoutMs: number;
}
export const OPENAI_COPY_CONFIG = Symbol('OPENAI_COPY_CONFIG');
export function readOpenAICopyConfig(env: NodeJS.ProcessEnv): OpenAICopyConfig {
  const apiKey = env.OPENAI_API_KEY?.trim() || null;
  const model = env.OPENAI_COPY_MODEL?.trim() || '';
  const effort = env.OPENAI_COPY_REASONING_EFFORT?.trim() || null;
  const timeoutMs = Number(env.OPENAI_COPY_TIMEOUT_MS ?? 20000);
  if (apiKey && !model) throw new Error('OPENAI_COPY_MODEL es obligatorio al configurar OpenAI.');
  if (effort !== null && !(REASONING_EFFORTS as readonly string[]).includes(effort))
    throw new Error(
      `OPENAI_COPY_REASONING_EFFORT debe ser uno de: ${REASONING_EFFORTS.join(', ')}.`,
    );
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 40000)
    throw new Error('OPENAI_COPY_TIMEOUT_MS debe estar entre 100 y 40000.');
  return { apiKey, model, reasoningEffort: effort as ReasoningEffort | null, timeoutMs };
}
export const openAICopyConfigProvider = {
  provide: OPENAI_COPY_CONFIG,
  useFactory: () => readOpenAICopyConfig(applicationEnvironment()),
};
