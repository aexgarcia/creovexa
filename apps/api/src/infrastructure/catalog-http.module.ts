import {
  ListPublicationHistory,
  ListPublicationAttempts,
} from '#app/modules/publications/application/list-publication-history';
import { PrismaPublicationHistoryReader } from '#app/modules/publications/infrastructure/prisma-publication-history-reader';
import { PublicationHistoryController } from '#app/modules/publications/presentation/publication-history.controller';
import { GetDashboard } from '#app/modules/dashboard/application/get-dashboard';
import { PrismaDashboardReader } from '#app/modules/dashboard/infrastructure/prisma-dashboard-reader';
import { DashboardController } from '#app/modules/dashboard/presentation/dashboard.controller';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { OrganizationController } from '#app/modules/organizations/presentation/organization.controller';
import { ConsoleLogger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { catalogHttpConfigProvider } from '#app/config/catalog-http.config';
import { ProductsController } from '#app/modules/products/presentation/products.controller';
import { TemplatesController } from '#app/modules/templates/presentation/templates.controller';
import { DevelopmentOrganizationGuard } from '#app/presentation/http/request-context';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { ApiExceptionFilter } from '#app/presentation/http/api-exception.filter';
import { CommercialPersistenceModule } from './commercial-persistence.module.js';
import { CampaignPersistenceModule } from './campaign-persistence.module.js';
import { CampaignsController } from '#app/modules/campaigns/presentation/campaigns.controller';
import { PublicationsController } from '#app/modules/publications/presentation/publications.controller';
import { PublicationPersistenceModule } from './publication-persistence.module.js';

@Module({
  imports: [
    DatabaseModule,
    CommercialPersistenceModule,
    CampaignPersistenceModule,
    PublicationPersistenceModule,
  ],
  controllers: [
    PublicationHistoryController,
    DashboardController,
    OrganizationController,
    ProductsController,
    TemplatesController,
    CampaignsController,
    PublicationsController,
  ],
  providers: [
    {
      provide: ListPublicationHistory,
      inject: [PrismaService],
      useFactory: (client: PrismaService) =>
        new ListPublicationHistory(new PrismaPublicationHistoryReader(client)),
    },
    {
      provide: ListPublicationAttempts,
      inject: [PrismaService],
      useFactory: (client: PrismaService) =>
        new ListPublicationAttempts(new PrismaPublicationHistoryReader(client)),
    },
    {
      provide: GetDashboard,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new GetDashboard(new PrismaDashboardReader(client)),
    },
    catalogHttpConfigProvider,
    DevelopmentOrganizationGuard,
    { provide: HTTP_LOGGER, useFactory: () => new ConsoleLogger('HTTP', { json: true }) },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [HTTP_LOGGER],
})
export class CatalogHttpModule {}
