import { ConsoleLogger, Module } from '@nestjs/common';
import { JOB_QUEUE } from '#app/application/ports/job-queue';
import { UNIT_OF_WORK } from '#app/application/ports/unit-of-work';
import { DATABASE_CONFIG, type DatabaseConfig } from '#app/config/database.config';
import { JOBS_CONFIG, jobsConfigProvider, type JobsConfig } from '#app/config/jobs.config';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { PrismaUnitOfWork } from '#app/infrastructure/persistence/prisma/prisma-unit-of-work';
import { PgBossJobQueue } from './pg-boss-job-queue.js';

// Trabajo en segundo plano compartido por todos los módulos: la cola, su configuración y las transacciones.
@Module({
  imports: [DatabaseModule],
  providers: [
    jobsConfigProvider,
    {
      provide: JOB_QUEUE,
      inject: [DATABASE_CONFIG, JOBS_CONFIG],
      useFactory: (database: DatabaseConfig, jobs: JobsConfig) =>
        new PgBossJobQueue(database, jobs.schema, new ConsoleLogger('Jobs', { json: true })),
    },
    {
      provide: UNIT_OF_WORK,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaUnitOfWork(client),
    },
  ],
  exports: [JOB_QUEUE, UNIT_OF_WORK, JOBS_CONFIG],
})
export class JobsModule {}
