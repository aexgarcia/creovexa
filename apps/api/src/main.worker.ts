import { NestFactory } from '@nestjs/core';
import { ConsoleLogger } from '@nestjs/common';
import { WorkerModule } from '#app/worker.module';

// Ejecuta los trabajos encolados sin servir HTTP. El mismo código que la API, otro punto de entrada.
async function bootstrap() {
  process.env.JOB_WORKER = 'true';
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  app.enableShutdownHooks();
}
await bootstrap();
