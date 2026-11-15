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
import { TemplateStyleReferencesController } from './presentation/template-style-references.controller.js';
import { AssetsModule } from '#app/modules/assets/assets.module';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import {
  TEMPLATE_STYLE_REFERENCES,
  type TemplateStyleReferences,
} from './application/ports/template-style-references.js';
import { MinioTemplateStyleReferences } from './infrastructure/minio-template-style-references.js';
import {
  AddTemplateStyleReference,
  GetTemplateStyleReference,
  RemoveTemplateStyleReference,
} from './application/use-cases/template-style-references.js';

@Module({
  imports: [DatabaseModule, RuntimeModule, AssetsModule, HttpCommonModule, OrganizationsModule],
  controllers: [TemplatesController, TemplateStyleReferencesController],
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
      provide: TEMPLATE_STYLE_REFERENCES,
      inject: [PrismaService, OBJECT_STORAGE],
      useFactory: (client: PrismaService, storage: ObjectStorage) =>
        new MinioTemplateStyleReferences(client, storage),
    },
    {
      provide: AddTemplateStyleReference,
      inject: [PrismaTemplateRepository, TEMPLATE_STYLE_REFERENCES, ID_GENERATOR, CLOCK],
      useFactory: (
        repository: PrismaTemplateRepository,
        references: TemplateStyleReferences,
        ids: IdGenerator,
        clock: Clock,
      ) => new AddTemplateStyleReference(repository, references, ids, clock),
    },
    {
      provide: RemoveTemplateStyleReference,
      inject: [PrismaTemplateRepository, ID_GENERATOR, CLOCK],
      useFactory: (repository: PrismaTemplateRepository, ids: IdGenerator, clock: Clock) =>
        new RemoveTemplateStyleReference(repository, ids, clock),
    },
    {
      provide: GetTemplateStyleReference,
      inject: [TEMPLATE_STYLE_REFERENCES],
      useFactory: (references: TemplateStyleReferences) =>
        new GetTemplateStyleReference(references),
    },
    {
      provide: UpdateTemplate,
      inject: [PrismaTemplateRepository, ID_GENERATOR, CLOCK],
      useFactory: (repository: PrismaTemplateRepository, ids: IdGenerator, clock: Clock) =>
        new UpdateTemplate(repository, ids, clock),
    },
  ],
  // content-generation envía las referencias de estilo congeladas al generar el flyer.
  exports: [TEMPLATE_STYLE_REFERENCES],
})
export class TemplatesModule {}
