import { NestFactory } from '@nestjs/core';
import { ConsoleLogger } from '@nestjs/common';
import { WorkerModule } from '#app/worker.module';

// Executes queued jobs without serving HTTP. Same code as the API, another entry point.
async function bootstrap() {
  process.env.JOB_WORKER = 'true';
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  app.enableShutdownHooks();
}
await bootstrap();
