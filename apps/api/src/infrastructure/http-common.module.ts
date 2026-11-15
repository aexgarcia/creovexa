import { ConsoleLogger, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { catalogHttpConfigProvider, CATALOG_HTTP_CONFIG } from '#app/config/catalog-http.config';
import { ApiExceptionFilter } from '#app/presentation/http/api-exception.filter';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { DevelopmentOrganizationGuard } from '#app/presentation/http/request-context';

// Piezas HTTP que necesita todo módulo de negocio: organización activa, logs y traducción de errores.
@Module({
  providers: [
    catalogHttpConfigProvider,
    DevelopmentOrganizationGuard,
    { provide: HTTP_LOGGER, useFactory: () => new ConsoleLogger('HTTP', { json: true }) },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
  exports: [CATALOG_HTTP_CONFIG, DevelopmentOrganizationGuard, HTTP_LOGGER],
})
export class HttpCommonModule {}
