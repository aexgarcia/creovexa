import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { STORAGE_CONFIG, type StorageConfig } from '#app/config/storage.config';
import {
  ORGANIZATION_LOGOS,
  type OrganizationLogos,
} from '#app/modules/organizations/application/ports/organization-logos';
import { MinioOrganizationLogos } from '#app/modules/organizations/infrastructure/minio-organization-logos';
import { SaveOrganizationLogo } from '#app/modules/organizations/application/use-cases/save-organization-logo';
import { GetOrganizationLogo } from '#app/modules/organizations/application/use-cases/get-organization-logo';
import { PrismaOrganizationRepository } from '#app/modules/organizations/infrastructure/persistence/prisma/prisma-organization.repository';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { RuntimeModule, CLOCK, ID_GENERATOR } from './runtime.module.js';
import { StorageModule } from './storage.module.js';

@Module({
  imports: [DatabaseModule, RuntimeModule, StorageModule],
  providers: [
    {
      provide: ORGANIZATION_LOGOS,
      inject: [PrismaService, STORAGE_CONFIG],
      useFactory: (client: PrismaService, config: StorageConfig | null) =>
        new MinioOrganizationLogos(client, config),
    },
    {
      provide: SaveOrganizationLogo,
      inject: [PrismaService, ORGANIZATION_LOGOS, ID_GENERATOR, CLOCK],
      useFactory: (
        client: PrismaService,
        logos: OrganizationLogos,
        ids: IdGenerator,
        clock: Clock,
      ) => new SaveOrganizationLogo(new PrismaOrganizationRepository(client), logos, ids, clock),
    },
    {
      provide: GetOrganizationLogo,
      inject: [ORGANIZATION_LOGOS],
      useFactory: (logos: OrganizationLogos) => new GetOrganizationLogo(logos),
    },
  ],
  exports: [ORGANIZATION_LOGOS, SaveOrganizationLogo, GetOrganizationLogo],
})
export class OrganizationLogosModule {}
