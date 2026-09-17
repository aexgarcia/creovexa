import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const templates = [
  ['.env.example', '.env'],
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.example', 'apps/web/.env.local'],
];

for (const [template, destination] of templates) {
  const target = new URL(destination, root);
  if (existsSync(target)) {
    console.log(`Conservado: ${destination}`);
    continue;
  }
  const content = readFileSync(new URL(template, root), 'utf8').replace(
    /__GENERATE_[A-Z_]+__/g,
    () => randomBytes(32).toString('hex'),
  );
  writeFileSync(target, content, { flag: 'wx', mode: 0o600 });
  console.log(`Creado: ${destination}`);
}
