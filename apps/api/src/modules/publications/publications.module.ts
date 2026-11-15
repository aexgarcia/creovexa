import { Module } from '@nestjs/common';
import { PUBLICATION_TRANSACTION } from '#app/application/ports/publication-transaction';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaPublicationTransaction } from '#app/infrastructure/persistence/prisma/prisma-publication-transaction';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import {
  ListPublicationAttempts,
  ListPublicationHistory,
} from './application/list-publication-history.js';
import { ListCampaignPublications } from './application/use-cases/list-campaign-publications.js';
import { PrismaPublicationCampaignLookup } from './infrastructure/persistence/prisma/prisma-publication-campaign-lookup.js';
import { PrismaPublicationRepository } from './infrastructure/persistence/prisma/prisma-publication.repository.js';
import { PrismaPublicationHistoryReader } from './infrastructure/prisma-publication-history-reader.js';
import { PublicationHistoryController } from './presentation/publication-history.controller.js';
import { PublicationsController } from './presentation/publications.controller.js';

@Module({
  imports: [DatabaseModule, HttpCommonModule],
  controllers: [PublicationsController, PublicationHistoryController],
  providers: [
    {
      provide: PrismaPublicationRepository,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaPublicationRepository(db),
    },
    {
      provide: PrismaPublicationCampaignLookup,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaPublicationCampaignLookup(db),
    },
    {
      provide: PrismaPublicationHistoryReader,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaPublicationHistoryReader(db),
    },
    {
      provide: PUBLICATION_TRANSACTION,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaPublicationTransaction(db),
    },
    {
      provide: ListCampaignPublications,
      inject: [PrismaPublicationRepository, PrismaPublicationCampaignLookup],
      useFactory: (
        repository: PrismaPublicationRepository,
        lookup: PrismaPublicationCampaignLookup,
      ) => new ListCampaignPublications(repository, lookup),
    },
    ...[ListPublicationHistory, ListPublicationAttempts].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaPublicationHistoryReader],
      useFactory: (reader: PrismaPublicationHistoryReader) => new UseCase(reader),
    })),
  ],
  exports: [PUBLICATION_TRANSACTION],
})
export class PublicationsModule {}
