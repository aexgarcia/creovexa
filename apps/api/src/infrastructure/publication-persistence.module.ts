import { Module } from '@nestjs/common';
import { PUBLICATION_TRANSACTION } from '#app/application/ports/publication-transaction';
import { PrismaPublicationRepository } from '#app/modules/publications/infrastructure/persistence/prisma/prisma-publication.repository';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaPublicationTransaction } from './persistence/prisma/prisma-publication-transaction.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: PrismaPublicationRepository,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaPublicationRepository(db),
    },
    {
      provide: PUBLICATION_TRANSACTION,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaPublicationTransaction(db),
    },
  ],
  exports: [PrismaPublicationRepository, PUBLICATION_TRANSACTION],
})
export class PublicationPersistenceModule {}
