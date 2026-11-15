import { applicationEnvironment } from './environment.js';

export interface RendererConfig {
  timeoutMs: number;
}
export const RENDERER_CONFIG = Symbol('RENDERER_CONFIG');
export function readRendererConfig(env: NodeJS.ProcessEnv): RendererConfig {
  const timeoutMs = Number(env.RENDER_TIMEOUT_MS ?? 20000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new Error('RENDER_TIMEOUT_MS debe estar entre 100 y 30000.');
  return { timeoutMs };
}
export const rendererConfigProvider = {
  provide: RENDERER_CONFIG,
  useFactory: () => readRendererConfig(applicationEnvironment()),
};
