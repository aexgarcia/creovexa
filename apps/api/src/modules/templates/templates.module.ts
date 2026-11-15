import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaOrganizationLookup } from '#app/infrastructure/persistence/prisma/prisma-organization-lookup';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { RuntimeModule, CLOCK, ID_GENERATOR } from '#app/infrastructure/runtime.module';
import { OrganizationsModule } from '#app/modules/organizations/organizations.module';
import { CreateTemplate } from './application/use-cases/create-template.js';
import { GetTemplate } from './application/use-cases/get-template.js';
import { ListTemplates } from './application/use-cases/list-templates.js';
import { UpdateTemplate } from './application/use-cases/update-template.js';
import { PrismaTemplateRepository } from './infrastructure/persistence/prisma/prisma-template.repository.js';
import { TemplatesController } from './presentation/templates.controller.js';

@Module({
  imports: [DatabaseModule, RuntimeModule, HttpCommonModule, OrganizationsModule],
  controllers: [TemplatesController],
  providers: [
    {
      provide: PrismaTemplateRepository,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaTemplateRepository(client),
    },
    ...[GetTemplate, ListTemplates].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaTemplateRepository],
      useFactory: (repository: PrismaTemplateRepository) => new UseCase(repository),
    })),
    {
      provide: CreateTemplate,
      inject: [PrismaTemplateRepository, PrismaOrganizationLookup, ID_GENERATOR, CLOCK],
      useFactory: (
        repository: PrismaTemplateRepository,
        organizations: PrismaOrganizationLookup,
        ids: IdGenerator,
        clock: Clock,
      ) => new CreateTemplate(repository, organizations, ids, clock),
    },
    {
      provide: UpdateTemplate,
      inject: [PrismaTemplateRepository, ID_GENERATOR, CLOCK],
      useFactory: (repository: PrismaTemplateRepository, ids: IdGenerator, clock: Clock) =>
        new UpdateTemplate(repository, ids, clock),
    },
  ],
})
export class TemplatesModule {}
