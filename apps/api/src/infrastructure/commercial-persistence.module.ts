import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { CreateOrganization } from '#app/modules/organizations/application/use-cases/create-organization';
import { UpdateOrganizationProfile } from '#app/modules/organizations/application/use-cases/update-organization-profile';
import { CreateProduct } from '#app/modules/products/application/use-cases/create-product';
import { UpdateProduct } from '#app/modules/products/application/use-cases/update-product';
import { CreateTemplate } from '#app/modules/templates/application/use-cases/create-template';
import { GetProduct } from '#app/modules/products/application/use-cases/get-product';
import { ListProducts } from '#app/modules/products/application/use-cases/list-products';
import { GetTemplate } from '#app/modules/templates/application/use-cases/get-template';
import { ListTemplates } from '#app/modules/templates/application/use-cases/list-templates';
import { PrismaOrganizationRepository } from '#app/modules/organizations/infrastructure/persistence/prisma/prisma-organization.repository';
import { PrismaProductRepository } from '#app/modules/products/infrastructure/persistence/prisma/prisma-product.repository';
import { PrismaTemplateRepository } from '#app/modules/templates/infrastructure/persistence/prisma/prisma-template.repository';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { PrismaOrganizationLookup } from './persistence/prisma/prisma-organization-lookup.js';
import { RuntimeModule, CLOCK, ID_GENERATOR } from './runtime.module.js';

@Module({
  imports: [DatabaseModule, RuntimeModule],
  providers: [
    {
      provide: GetProduct,
      inject: [PrismaProductRepository],
      useFactory: (repository: PrismaProductRepository) => new GetProduct(repository),
    },
    {
      provide: ListProducts,
      inject: [PrismaProductRepository],
      useFactory: (repository: PrismaProductRepository) => new ListProducts(repository),
    },
    {
      provide: GetTemplate,
      inject: [PrismaTemplateRepository],
      useFactory: (repository: PrismaTemplateRepository) => new GetTemplate(repository),
    },
    {
      provide: ListTemplates,
      inject: [PrismaTemplateRepository],
      useFactory: (repository: PrismaTemplateRepository) => new ListTemplates(repository),
    },
    {
      provide: PrismaOrganizationRepository,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaOrganizationRepository(client),
    },
    {
      provide: PrismaProductRepository,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaProductRepository(client),
    },
    {
      provide: PrismaTemplateRepository,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaTemplateRepository(client),
    },
    {
      provide: PrismaOrganizationLookup,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaOrganizationLookup(client),
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
      provide: CreateProduct,
      inject: [PrismaProductRepository, PrismaOrganizationLookup, ID_GENERATOR, CLOCK],
      useFactory: (
        repository: PrismaProductRepository,
        organizations: PrismaOrganizationLookup,
        ids: IdGenerator,
        clock: Clock,
      ) => new CreateProduct(repository, organizations, ids, clock),
    },
    {
      provide: UpdateProduct,
      inject: [PrismaProductRepository, CLOCK],
      useFactory: (repository: PrismaProductRepository, clock: Clock) =>
        new UpdateProduct(repository, clock),
    },
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
  ],
  exports: [
    GetProduct,
    ListProducts,
    GetTemplate,
    ListTemplates,
    CreateOrganization,
    UpdateOrganizationProfile,
    CreateProduct,
    UpdateProduct,
    CreateTemplate,
  ],
})
export class CommercialPersistenceModule {}
