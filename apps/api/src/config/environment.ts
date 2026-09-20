import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

export function applicationEnvironment(): NodeJS.ProcessEnv {
  const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
  if (existsSync(envPath)) loadEnvFile(envPath);
  return process.env;
}
