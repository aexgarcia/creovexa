import { applicationEnvironment } from './environment.js';

export interface ApplicationConfig {
  port: number;
  host: string;
  corsOrigin: string;
}

export const APPLICATION_CONFIG = Symbol('APPLICATION_CONFIG');

export function readApplicationConfig(environment: NodeJS.ProcessEnv): ApplicationConfig {
  const portValue = environment.API_PORT ?? '3001';
  const port = Number(portValue);
  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configuración inválida: API_PORT debe ser un puerto entre 1 y 65535.');
  }

  const host = environment.API_HOST ?? '127.0.0.1';
  if (!host.trim()) {
    throw new Error('Configuración inválida: API_HOST no puede estar vacío.');
  }

  const corsOrigin = environment.CORS_ORIGIN ?? 'http://localhost:3000';
  try {
    const url = new URL(corsOrigin);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    ) {
      throw new Error();
    }
  } catch {
    throw new Error('Configuración inválida: CORS_ORIGIN debe ser un origen HTTP o HTTPS.');
  }

  return { port, host, corsOrigin: new URL(corsOrigin).origin };
}

export const applicationConfigProvider = {
  provide: APPLICATION_CONFIG,
  useFactory: (): ApplicationConfig => {
    return readApplicationConfig(applicationEnvironment());
  },
};
