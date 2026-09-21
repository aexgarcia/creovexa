import type {
  PublicationTransaction,
  PublicationRepositories,
} from '#app/application/ports/publication-transaction';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaPublicationRepository } from '#app/modules/publications/infrastructure/persistence/prisma/prisma-publication.repository';
import { ConcurrentPublicationModificationError } from '#app/modules/publications/domain/errors/publication.errors';
import { Prisma } from './generated/client.js';
import type { PrismaService } from './prisma.service.js';
import { translatePrismaError } from './translate-prisma-error.js';

export class PrismaPublicationTransaction implements PublicationTransaction {
  constructor(private readonly database: PrismaService) {}

  async run<T>(work: (repositories: PublicationRepositories) => Promise<T>): Promise<T> {
    try {
      return await this.database.$transaction(
        async (tx) =>
          work({
            campaigns: new PrismaCampaignRepository(tx),
            publications: new PrismaPublicationRepository(tx),
          }),
        { isolationLevel: 'RepeatableRead' },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')
        throw new ConcurrentPublicationModificationError();
      translatePrismaError(error);
    }
  }
}
