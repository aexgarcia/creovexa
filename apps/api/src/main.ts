import { NestFactory } from '@nestjs/core';
import { ConsoleLogger } from '@nestjs/common';
import { AppModule } from '#app/app.module';
import { APPLICATION_CONFIG, type ApplicationConfig } from './config/application.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  const config = app.get<ApplicationConfig>(APPLICATION_CONFIG);
  app.enableCors({ origin: config.corsOrigin });
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
}
await bootstrap();
