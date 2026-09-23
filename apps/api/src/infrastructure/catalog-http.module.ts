import { ConsoleLogger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { catalogHttpConfigProvider } from '#app/config/catalog-http.config';
import { ProductsController } from '#app/modules/products/presentation/products.controller';
import { TemplatesController } from '#app/modules/templates/presentation/templates.controller';
import { DevelopmentOrganizationGuard } from '#app/presentation/http/request-context';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { ApiExceptionFilter } from '#app/presentation/http/api-exception.filter';
import { CommercialPersistenceModule } from './commercial-persistence.module.js';

@Module({
  imports: [CommercialPersistenceModule],
  controllers: [ProductsController, TemplatesController],
  providers: [
    catalogHttpConfigProvider,
    DevelopmentOrganizationGuard,
    { provide: HTTP_LOGGER, useFactory: () => new ConsoleLogger('HTTP', { json: true }) },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [HTTP_LOGGER],
})
export class CatalogHttpModule {}
