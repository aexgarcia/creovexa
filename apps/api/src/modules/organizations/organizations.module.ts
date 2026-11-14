import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { STORAGE_CONFIG, type StorageConfig } from '#app/config/storage.config';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaOrganizationLookup } from '#app/infrastructure/persistence/prisma/prisma-organization-lookup';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { RuntimeModule, CLOCK, ID_GENERATOR } from '#app/infrastructure/runtime.module';
import { StorageModule } from '#app/infrastructure/storage.module';
import {
  ORGANIZATION_LOGOS,
  type OrganizationLogos,
} from './application/ports/organization-logos.js';
import { CreateOrganization } from './application/use-cases/create-organization.js';
import { GetOrganization } from './application/use-cases/get-organization.js';
import { GetOrganizationLogo } from './application/use-cases/get-organization-logo.js';
import { SaveOrganizationLogo } from './application/use-cases/save-organization-logo.js';
import { UpdateOrganizationProfile } from './application/use-cases/update-organization-profile.js';
import { MinioOrganizationLogos } from './infrastructure/minio-organization-logos.js';
import { PrismaOrganizationRepository } from './infrastructure/persistence/prisma/prisma-organization.repository.js';
import { OrganizationController } from './presentation/organization.controller.js';

@Module({
  imports: [DatabaseModule, RuntimeModule, StorageModule, HttpCommonModule],
  controllers: [OrganizationController],
  providers: [
    {
      provide: PrismaOrganizationRepository,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaOrganizationRepository(client),
    },
    {
      provide: PrismaOrganizationLookup,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaOrganizationLookup(client),
    },
    {
      provide: ORGANIZATION_LOGOS,
      inject: [PrismaService, STORAGE_CONFIG],
      useFactory: (client: PrismaService, config: StorageConfig | null) =>
        new MinioOrganizationLogos(client, config),
    },
    {
      provide: GetOrganization,
      inject: [PrismaOrganizationRepository],
      useFactory: (repository: PrismaOrganizationRepository) => new GetOrganization(repository),
    },
    {
      provide: CreateOrganization,
      inject: [PrismaOrganizationRepository, ID_GENERATOR, CLOCK],
      useFactory: (repository: PrismaOrganizationRepository, ids: IdGenerator, clock: Clock) =>
        new CreateOrganization(repository, ids, clock),
    },
    {
      provide: UpdateOrganizationProfile,
      inject: [PrismaOrganizationRepository, CLOCK],
      useFactory: (repository: PrismaOrganizationRepository, clock: Clock) =>
        new UpdateOrganizationProfile(repository, clock),
    },
    {
      provide: SaveOrganizationLogo,
      inject: [PrismaOrganizationRepository, ORGANIZATION_LOGOS, ID_GENERATOR, CLOCK],
      useFactory: (
        repository: PrismaOrganizationRepository,
        logos: OrganizationLogos,
        ids: IdGenerator,
        clock: Clock,
      ) => new SaveOrganizationLogo(repository, logos, ids, clock),
    },
    {
      provide: GetOrganizationLogo,
      inject: [ORGANIZATION_LOGOS],
      useFactory: (logos: OrganizationLogos) => new GetOrganizationLogo(logos),
    },
  ],
  // Other modules may only check that an organization exists and read its logo.
  exports: [PrismaOrganizationLookup, ORGANIZATION_LOGOS],
})
export class OrganizationsModule {}
