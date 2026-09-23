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
  imports: [CommercialPersistenceModule, CampaignPersistenceModule, PublicationPersistenceModule],
  controllers: [
    ProductsController,
    TemplatesController,
    CampaignsController,
    PublicationsController,
  ],
  providers: [
    catalogHttpConfigProvider,
    DevelopmentOrganizationGuard,
    { provide: HTTP_LOGGER, useFactory: () => new ConsoleLogger('HTTP', { json: true }) },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [HTTP_LOGGER],
})
export class CatalogHttpModule {}
