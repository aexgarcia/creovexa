import type { TransactionContext } from './transaction-context.js';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

// Ejecuta trabajo que varios ports deben confirmar juntos. Sin llamadas externas dentro.
export interface UnitOfWork {
  run<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T>;
}
