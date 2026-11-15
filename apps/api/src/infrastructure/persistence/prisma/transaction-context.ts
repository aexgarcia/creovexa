import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { Prisma } from './generated/client.js';

export function transactionContext(client: Prisma.TransactionClient): TransactionContext {
  return client as unknown as TransactionContext;
}

export function prismaTransaction(context: TransactionContext): Prisma.TransactionClient {
  return context as unknown as Prisma.TransactionClient;
}
