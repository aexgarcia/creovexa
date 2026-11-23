import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { AUTH_BASE_PATH, type AuthConfig } from '#app/config/auth.config';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';

// Better Auth queda confinado a infraestructura (ADR-0012): dominio y aplicación usan contratos
// propios de Creovexa. Versión fijada en package.json; cada actualización se revisa con las
// pruebas, porque el alta administrativa usa su adapter interno.
export function createAuth(config: AuthConfig, client: PrismaClient) {
  return betterAuth({
    appName: 'Creovexa',
    baseURL: config.baseUrl,
    basePath: AUTH_BASE_PATH,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: prismaAdapter(client, { provider: 'postgresql' }),
    // Sin registro público: el propietario del despliegue da de alta a los usuarios.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Sin caché en cookie: cada request comprueba la sesión en PostgreSQL y una revocación
      // surte efecto de inmediato.
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: () => randomUUID() },
      useSecureCookies: config.production,
      // Better Auth apaga estas comprobaciones si NODE_ENV=test. Se fijan para que la protección
      // contra CSRF y orígenes ajenos no dependa de esa variable, y las pruebas la verifiquen.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: config.production },
    },
    // Sin datos de uso a terceros.
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
