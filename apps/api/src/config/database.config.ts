import { applicationEnvironment } from './environment.js';

export interface DatabaseConfig {
  url: string;
  schema: string;
}

export const DATABASE_CONFIG = Symbol('DATABASE_CONFIG');

export function readDatabaseConfig(environment: NodeJS.ProcessEnv): DatabaseConfig {
  try {
    const url = new URL(environment.DATABASE_URL ?? '');
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      url.pathname === '/' ||
      !url.pathname ||
      url.hash
    )
      throw new Error();
    const schema = url.searchParams.get('schema') ?? 'public';
    if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(schema)) throw new Error();
    return { url: url.toString(), schema };
  } catch {
    throw new Error(
      'Configuración inválida: DATABASE_URL debe indicar una conexión PostgreSQL y un schema válido.',
    );
  }
}

export const databaseConfigProvider = {
  provide: DATABASE_CONFIG,
  useFactory: (): DatabaseConfig => readDatabaseConfig(applicationEnvironment()),
};
