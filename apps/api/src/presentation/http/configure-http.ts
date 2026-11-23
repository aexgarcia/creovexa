import { mountAuth } from '#app/modules/identity/infrastructure/mount-auth';
import type { INestApplication, LoggerService } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { APPLICATION_CONFIG, type ApplicationConfig } from '#app/config/application.config';
import { HTTP_LOGGER, requestLogging } from './http-logging.js';

export function configureHttp(app: INestApplication): void {
  const config = app.get<ApplicationConfig>(APPLICATION_CONFIG);
  app.use(requestLogging(app.get<LoggerService>(HTTP_LOGGER)));
  // credentials: el CMS envía la cookie de sesión (ADR-0012).
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });
  mountAuth(app);
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Creovexa API')
      .setVersion('0.1.0')
      .setDescription(
        'Catálogo de productos y plantillas. Organización configurada en servidor para desarrollo; autenticación pendiente de fase 9.',
      )
      .build(),
  );
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'openapi.json',
    swaggerOptions: { persistAuthorization: false },
  });
}
