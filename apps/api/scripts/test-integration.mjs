import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const apiRoot = fileURLToPath(new URL('../', import.meta.url));
const envFile = new URL('../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);
const connection = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connection)
  throw new Error(
    'Configura TEST_DATABASE_URL o ejecuta pnpm setup:env antes de las pruebas de integración.',
  );

const schema = 'creovexa_test_' + randomUUID().replaceAll('-', '');
const jobSchema = 'jobs_' + schema.slice('creovexa_test_'.length);
let url;
try {
  url = new URL(connection);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
} catch {
  throw new Error('La conexión de pruebas debe ser una URL PostgreSQL válida.');
}
url.searchParams.set('schema', schema);
const environment = {
  ...process.env,
  DATABASE_URL: url.toString(),
  TEST_DATABASE_URL: url.toString(),
  CREOVEXA_TEST_SCHEMA: schema,
  // pg-boss limita los nombres de esquema a 50 caracteres; el esquema de pruebas ya ocupa 46.
  JOB_SCHEMA: jobSchema,
};
const storageTests = process.argv.includes('--storage');
if (storageTests && !environment.TEST_STORAGE_ENDPOINT) {
  // Solo el servicio local de Docker puede usar las credenciales root de desarrollo como respaldo de las pruebas.
  const rootEnv = new URL('../../../.env', import.meta.url);
  const local = existsSync(rootEnv) ? parseEnv(readFileSync(rootEnv, 'utf8')) : {};
  environment.TEST_STORAGE_ENDPOINT = `http://127.0.0.1:${local.MINIO_PORT || '9000'}`;
  environment.TEST_STORAGE_ACCESS_KEY = local.MINIO_ROOT_USER;
  environment.TEST_STORAGE_SECRET_KEY = local.MINIO_ROOT_PASSWORD;
}
const administrator = new pg.Client({
  connectionString: connection,
  connectionTimeoutMillis: 5000,
});
let created = false;

function run(relative, args) {
  const entry = fileURLToPath(new URL(relative, import.meta.url));
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: apiRoot,
    env: environment,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Falló una verificación de integración.');
}

try {
  await administrator.connect();
  await administrator.query('CREATE SCHEMA "' + schema + '"');
  created = true;
  run('../node_modules/prisma/build/index.js', ['migrate', 'deploy']);
  run('../node_modules/prisma/build/index.js', ['migrate', 'deploy']);
  // Solo en el esquema temporal: cada organización que crean las pruebas recibe el plan más
  // amplio, para que los cupos de ADR-0033 no interfieran. Las pruebas de cupos fijan su plan.
  await administrator.query(`
    CREATE FUNCTION "${schema}".assign_test_plan() RETURNS trigger AS $$
    BEGIN
      INSERT INTO "${schema}"."organization_plans" ("organization_id", "plan", "period_anchor", "assigned_at")
      VALUES (NEW."id", 'AGENCIA', current_date, now())
      ON CONFLICT DO NOTHING;
      RETURN NEW;
    END $$ LANGUAGE plpgsql;
    CREATE TRIGGER assign_test_plan AFTER INSERT ON "${schema}"."organizations"
      FOR EACH ROW EXECUTE FUNCTION "${schema}".assign_test_plan();
  `);
  run('../node_modules/vitest/vitest.mjs', [
    'run',
    '--config',
    storageTests ? './vitest.config.storage.ts' : './vitest.config.integration.ts',
  ]);
} finally {
  try {
    if (created && /^creovexa_test_[0-9a-f]{32}$/.test(schema)) {
      await administrator.query('DROP SCHEMA "' + schema + '" CASCADE');
      // Los trabajos en segundo plano guardan sus tablas junto al esquema de pruebas.
      await administrator.query('DROP SCHEMA IF EXISTS "' + jobSchema + '" CASCADE');
    }
  } finally {
    await administrator.end();
  }
}
