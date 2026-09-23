import { NestFactory } from '@nestjs/core';
import { ConsoleLogger } from '@nestjs/common';
import { AppModule } from '#app/app.module';
import { APPLICATION_CONFIG, type ApplicationConfig } from './config/application.config.js';
import { configureHttp } from './presentation/http/configure-http.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  const config = app.get<ApplicationConfig>(APPLICATION_CONFIG);
  configureHttp(app);
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
}
await bootstrap();
