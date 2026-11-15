import { applicationEnvironment } from './environment.js';

export interface JobsConfig {
  // Si este proceso ejecuta los trabajos encolados, además de poder encolarlos.
  worker: boolean;
  // Esquema de PostgreSQL para las tablas de la cola; con null se deriva del esquema de la base de datos.
  schema: string | null;
}

export const JOBS_CONFIG = Symbol('JOBS_CONFIG');

// pg-boss rechaza nombres de esquema más largos.
const SCHEMA = /^[a-z_][a-z0-9_]{0,49}$/;

export function readJobsConfig(environment: NodeJS.ProcessEnv): JobsConfig {
  const schema = environment.JOB_SCHEMA?.trim() || null;
  if (schema !== null && !SCHEMA.test(schema))
    throw new Error(
      'Configuración inválida: JOB_SCHEMA debe usar minúsculas, dígitos o _ y tener hasta 50 caracteres.',
    );
  const value = environment.JOB_WORKER?.trim();
  if (value === undefined || value === '')
    return { worker: environment.NODE_ENV !== 'test', schema };
  if (value !== 'true' && value !== 'false')
    throw new Error('Configuración inválida: JOB_WORKER debe ser true o false.');
  return { worker: value === 'true', schema };
}

export const jobsConfigProvider = {
  provide: JOBS_CONFIG,
  useFactory: (): JobsConfig => readJobsConfig(applicationEnvironment()),
};
