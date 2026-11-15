import type { PrismaService } from './prisma.service.js';
import type { Prisma } from './generated/client.js';

export type PrismaSession = PrismaService | Prisma.TransactionClient;

/** Reutiliza una transacción explícita en lugar de abrir un commit anidado independiente. */
export function inPrismaTransaction<T>(
  session: PrismaSession,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  isolationLevel?: Prisma.TransactionIsolationLevel,
): Promise<T> {
  return '$transaction' in session ? session.$transaction(work, { isolationLevel }) : work(session);
}
