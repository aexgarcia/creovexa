import { randomBytes } from 'node:crypto';
import { applicationEnvironment } from './environment.js';
import { readApplicationConfig } from './application.config.js';

// Autenticación con Better Auth (ADR-0012).
export interface AuthConfig {
  // Firma las cookies y tokens. Obligatorio en producción; en desarrollo y pruebas, si falta, se
  // genera uno por proceso y las sesiones no sobreviven a un reinicio.
  secret: string;
  // URL pública de la API; Better Auth arma con ella los enlaces de los correos.
  baseUrl: string;
  // Orígenes desde los que se aceptan peticiones con cookie: el del CMS.
  trustedOrigins: string[];
  production: boolean;
}

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');
export const AUTH_BASE_PATH = '/auth';

export function readAuthConfig(env: NodeJS.ProcessEnv): AuthConfig {
  const production = env.NODE_ENV === 'production';
  const application = readApplicationConfig(env);
  let secret = env.AUTH_SECRET?.trim() ?? '';
  if (!secret) {
    if (production) throw new Error('AUTH_SECRET es obligatorio en producción.');
    secret = randomBytes(32).toString('base64url');
  }
  if (secret.length < 32) throw new Error('AUTH_SECRET debe tener al menos 32 caracteres.');
  const baseUrl = env.AUTH_BASE_URL?.trim() || `http://${application.host}:${application.port}`;
  try {
    const url = new URL(baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    if (production && url.protocol !== 'https:') throw new Error();
  } catch {
    throw new Error('AUTH_BASE_URL debe ser una URL HTTP o HTTPS (HTTPS en producción).');
  }
  return {
    secret,
    baseUrl: new URL(baseUrl).origin,
    trustedOrigins: [application.corsOrigin],
    production,
  };
}

export const authConfigProvider = {
  provide: AUTH_CONFIG,
  useFactory: () => readAuthConfig(applicationEnvironment()),
};
