import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const root = new URL('../', import.meta.url);
function readEnvironment(relativePath) {
  const path = new URL(relativePath, root);
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {};
}
const environment = { ...readEnvironment('.env'), ...process.env };
const apiEnvironment = { ...readEnvironment('apps/api/.env'), ...process.env };
const checks = [
  ['web', 'http://127.0.0.1:3000/health'],
  ['api', `http://127.0.0.1:${apiEnvironment.API_PORT ?? 3001}/health`],
  ['n8n', `http://127.0.0.1:${environment.N8N_PORT ?? 5678}/healthz/readiness`],
  ['minio', `http://127.0.0.1:${environment.MINIO_PORT ?? 9000}/minio/health/live`],
];
const selectedChecks = checks.filter(
  ([name]) => !process.argv.includes('--apps-only') || ['web', 'api'].includes(name),
);
const results = await Promise.all(
  selectedChecks.map(async ([name, url]) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log(`${name}: ${response.ok ? 'OK' : `HTTP ${response.status}`}`);
      return response.ok;
    } catch {
      console.error(`${name}: no disponible`);
      return false;
    }
  }),
);
if (results.some((success) => !success)) process.exitCode = 1;
