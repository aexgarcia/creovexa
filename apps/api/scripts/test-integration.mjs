import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
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
};
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
  run('../node_modules/vitest/vitest.mjs', ['run', '--config', './vitest.config.integration.ts']);
} finally {
  try {
    if (created && /^creovexa_test_[0-9a-f]{32}$/.test(schema)) {
      await administrator.query('DROP SCHEMA "' + schema + '" CASCADE');
    }
  } finally {
    await administrator.end();
  }
}
