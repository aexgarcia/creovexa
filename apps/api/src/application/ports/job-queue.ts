import type { TransactionContext } from './transaction-context.js';

export const JOB_QUEUE = Symbol('JOB_QUEUE');

export interface QueuedJob {
  name: string;
  // At most one job per name and key waits or runs at a time.
  key: string;
  payload: Record<string, unknown>;
}

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

// Durable background work. A job outlives the request and the process that queued it.
export interface JobQueue {
  // With a transaction, the job exists only if that transaction commits.
  enqueue(job: QueuedJob, transaction?: TransactionContext): Promise<void>;
  // Runs the handler for each job of this name. A rejected promise marks the job as failed.
  process(name: string, handler: JobHandler): Promise<void>;
}
