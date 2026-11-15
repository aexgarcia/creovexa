import type { TransactionContext } from './transaction-context.js';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

export interface QueuedJob {
  name: string;
  // Como máximo un trabajo por nombre y clave espera o corre a la vez.
  key: string;
  payload: Record<string, unknown>;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

// Trabajo durable en segundo plano. Un trabajo sobrevive a la petición y al proceso que lo encoló.
export interface JobQueue {
  // Con una transacción, el trabajo existe solo si esa transacción se confirma.
  enqueue(job: QueuedJob, transaction?: TransactionContext): Promise<void>;
  // Ejecuta el handler en cada trabajo con este nombre. Una promesa rechazada marca el trabajo como fallido.
  process(name: string, handler: JobHandler): Promise<void>;
}
