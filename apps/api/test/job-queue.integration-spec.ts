import { randomUUID } from 'node:crypto';
import { readDatabaseConfig } from '#app/config/database.config';
import { readJobsConfig } from '#app/config/jobs.config';
import { PgBossJobQueue, jobSchema } from '#app/infrastructure/jobs/pg-boss-job-queue';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { PrismaUnitOfWork } from '#app/infrastructure/persistence/prisma/prisma-unit-of-work';

describe('PgBossJobQueue (PostgreSQL)', () => {
  const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
  const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
  const jobs = readJobsConfig(process.env);
  let database: PrismaService;
  let queue: PgBossJobQueue;
  let transactions: PrismaUnitOfWork;

  beforeAll(() => {
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa el runner de integración con un esquema aislado.');
    database = new PrismaService(config);
    queue = new PgBossJobQueue(config, jobs.schema, { log() {} });
    transactions = new PrismaUnitOfWork(database);
  });
  afterAll(async () => {
    await queue?.onModuleDestroy();
    await database?.$disconnect();
  });

  async function stored(name: string): Promise<number> {
    const rows = await database.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*) AS count FROM "${jobSchema(config, jobs.schema)}".job WHERE name = $1`,
      name,
    );
    return Number(rows[0]!.count);
  }

  it('keeps its tables in the schema the runner assigned, apart from the app tables', () => {
    expect(jobSchema(config, jobs.schema)).toBe(process.env.JOB_SCHEMA);
    expect(jobSchema(config, jobs.schema)).not.toBe(schema);
  });

  it('drops a job queued inside a transaction that rolls back', async () => {
    const name = 'rollback-' + randomUUID().slice(0, 8);
    await expect(
      transactions.run(async (transaction) => {
        await queue.enqueue({ name, key: 'k', payload: { value: 1 } }, transaction);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await stored(name)).toBe(0);
  });

  it('keeps a job queued inside a transaction that commits', async () => {
    const name = 'commit-' + randomUUID().slice(0, 8);
    await transactions.run((transaction) =>
      queue.enqueue({ name, key: 'k', payload: { value: 1 } }, transaction),
    );
    expect(await stored(name)).toBe(1);
  });

  it('accepts one waiting job per key and ignores repeated requests', async () => {
    const name = 'singleton-' + randomUUID().slice(0, 8);
    await queue.enqueue({ name, key: 'same', payload: {} });
    await queue.enqueue({ name, key: 'same', payload: {} });
    await queue.enqueue({ name, key: 'other', payload: {} });
    expect(await stored(name)).toBe(2);
  });

  it('delivers the payload to the worker', async () => {
    const name = 'deliver-' + randomUUID().slice(0, 8);
    const received: Record<string, unknown>[] = [];
    await queue.process(name, (payload) => {
      received.push(payload);
      return Promise.resolve();
    });
    await queue.enqueue({ name, key: 'k', payload: { campaignId: 'c-1' } });
    for (let waited = 0; received.length === 0 && waited < 15_000; waited += 250)
      await new Promise((done) => setTimeout(done, 250));
    expect(received).toEqual([{ campaignId: 'c-1' }]);
  }, 20_000);
});
