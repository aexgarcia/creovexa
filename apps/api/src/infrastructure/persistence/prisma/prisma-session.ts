import type { PrismaService } from './prisma.service.js';
import type { Prisma } from './generated/client.js';

export type PrismaSession = PrismaService | Prisma.TransactionClient;

/** Reuse an explicit transaction instead of opening an independent nested commit. */
export function inPrismaTransaction<T>(
  session: PrismaSession,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  isolationLevel?: Prisma.TransactionIsolationLevel,
): Promise<T> {
  return '$transaction' in session ? session.$transaction(work, { isolationLevel }) : work(session);
}
