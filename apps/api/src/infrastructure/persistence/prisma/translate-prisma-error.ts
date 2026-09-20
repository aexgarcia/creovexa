import { Prisma } from './generated/client.js';
import { PersistenceConflictError, PersistenceReferenceError } from '../persistence.errors.js';

export function translatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') throw new PersistenceConflictError();
    if (error.code === 'P2003') throw new PersistenceReferenceError();
  }
  throw error;
}
