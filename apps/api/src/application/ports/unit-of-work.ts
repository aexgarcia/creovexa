import type { TransactionContext } from './transaction-context.js';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

// Runs work that several ports must commit together. No external calls inside.
export interface UnitOfWork {
  run<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T>;
}
