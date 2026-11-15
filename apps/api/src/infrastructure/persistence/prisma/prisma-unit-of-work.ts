import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';
import type { PrismaClient } from './generated/client.js';
import { transactionContext } from './transaction-context.js';

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly client: PrismaClient) {}

  run<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    return this.client.$transaction((tx) => work(transactionContext(tx)));
  }
}
