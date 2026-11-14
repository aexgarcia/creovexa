import { applicationEnvironment } from './environment.js';

export interface JobsConfig {
  // Whether this process executes queued jobs, besides being able to queue them.
  worker: boolean;
  // PostgreSQL schema for the queue tables; null derives it from the database schema.
  schema: string | null;
}

export const JOBS_CONFIG = Symbol('JOBS_CONFIG');

// pg-boss rejects longer schema names.
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
