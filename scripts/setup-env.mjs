import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);
function localDatabaseUrl() {
  const values = parseEnv(readFileSync(new URL('.env', root), 'utf8'));
  if (!values.POSTGRES_USER || !values.POSTGRES_PASSWORD || !values.POSTGRES_DB) {
    throw new Error('Configura POSTGRES_USER, POSTGRES_PASSWORD y POSTGRES_DB en el entorno raíz.');
  }
  const url = new URL('postgresql://127.0.0.1');
  url.username = values.POSTGRES_USER;
  url.password = values.POSTGRES_PASSWORD;
  url.port = values.POSTGRES_PORT ?? '5432';
  url.pathname = '/' + values.POSTGRES_DB;
  url.searchParams.set('schema', 'public');
  return url.toString();
}
const templates = [
  ['.env.example', '.env'],
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env.local'],
];

for (const [template, destination] of templates) {
  const target = new URL(destination, root);
  if (existsSync(target)) {
    if (destination === 'apps/api/.env') {
      const content = readFileSync(target, 'utf8');
      if (!Object.hasOwn(parseEnv(content), 'DATABASE_URL')) {
        writeFileSync(target, content.trimEnd() + '\nDATABASE_URL=' + localDatabaseUrl() + '\n', {
          mode: 0o600,
        });
        console.log('Añadido DATABASE_URL a apps/api/.env');
      }
    }
    console.log(`Conservado: ${destination}`);
    continue;
  }
  let content = readFileSync(new URL(template, root), 'utf8').replace(/__GENERATE_[A-Z_]+__/g, () =>
    randomBytes(32).toString('hex'),
  );
  if (destination === 'apps/api/.env')
    content = content.replace('__LOCAL_DATABASE_URL__', localDatabaseUrl());
  writeFileSync(target, content, { flag: 'wx', mode: 0o600 });
  console.log(`Creado: ${destination}`);
}
