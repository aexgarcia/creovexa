import { PgBoss } from 'pg-boss';
import type { JobHandler, JobQueue, QueuedJob } from '#app/application/ports/job-queue';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { DatabaseConfig } from '#app/config/database.config';
import { prismaTransaction } from '#app/infrastructure/persistence/prisma/transaction-context';

interface JobLogger {
  log(event: { event: string; job: string; key?: string; error?: string }): void;
}

// Cada trabajo tiene un solo intento: los handlers ya acotan sus llamadas al proveedor, y repetir
// una generación de imagen tras un fallo ambiguo podría cobrarse dos veces.
const ATTEMPT_SECONDS = 360;

// Las tablas de la cola viven en su propio esquema, así las migraciones de la app nunca las tocan.
export function jobSchema(database: DatabaseConfig, configured: string | null): string {
  const schema =
    configured ?? (database.schema === 'public' ? 'pgboss' : database.schema + '_jobs');
  if (schema.length > 50)
    throw new Error(
      'Configuración inválida: el schema de la cola supera 50 caracteres; define JOB_SCHEMA.',
    );
  return schema;
}

export class PgBossJobQueue implements JobQueue {
  private boss: Promise<PgBoss> | null = null;
  private readonly queues = new Map<string, Promise<void>>();

  private readonly schema: string;

  constructor(
    private readonly database: DatabaseConfig,
    configuredSchema: string | null,
    private readonly logger: JobLogger,
  ) {
    this.schema = jobSchema(database, configuredSchema);
  }

  async enqueue(job: QueuedJob, transaction?: TransactionContext): Promise<void> {
    const boss = await this.queue(job.name);
    const client = transaction ? prismaTransaction(transaction) : null;
    // Un id null significa que ya hay un trabajo con esta clave esperando o corriendo, que es lo buscado.
    await boss.send(job.name, job.payload, {
      singletonKey: job.key,
      ...(client
        ? {
            db: {
              executeSql: async (text: string, values: unknown[] = []) => {
                const rows: unknown = await client.$queryRawUnsafe(text, ...values);
                return { rows: Array.isArray(rows) ? rows : [] };
              },
            },
          }
        : {}),
    });
  }

  async process(name: string, handler: JobHandler): Promise<void> {
    const boss = await this.queue(name);
    await boss.work<Record<string, unknown>>(name, async (jobs) => {
      for (const job of jobs) {
        try {
          await handler(job.data);
          this.logger.log({ event: 'job_completed', job: name });
        } catch (error) {
          this.logger.log({
            event: 'job_failed',
            job: name,
            error: error instanceof Error ? error.name : 'Error',
          });
          throw error;
        }
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.boss) return;
    const boss = await this.boss.catch(() => null);
    await boss?.stop({ graceful: true, timeout: 30_000 });
  }

  // Se conecta en el primer uso: un proceso que nunca encola ni ejecuta trabajos no necesita base de datos.
  private start(): Promise<PgBoss> {
    this.boss ??= (async () => {
      const url = new URL(this.database.url);
      url.searchParams.delete('schema');
      const boss = new PgBoss({
        connectionString: url.toString(),
        schema: this.schema,
        max: 4,
        schedule: false,
      });
      boss.on('error', (error) =>
        this.logger.log({ event: 'queue_error', job: '*', error: error.name }),
      );
      return boss.start();
    })();
    return this.boss;
  }

  private async queue(name: string): Promise<PgBoss> {
    const boss = await this.start();
    let created = this.queues.get(name);
    if (!created) {
      created = boss.createQueue(name, {
        policy: 'exclusive',
        retryLimit: 0,
        expireInSeconds: ATTEMPT_SECONDS,
      });
      this.queues.set(name, created);
    }
    await created;
    return boss;
  }
}
