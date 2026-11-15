import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  GetBucketPolicyCommand,
} from '@aws-sdk/client-s3';

// Configuración explícita para desarrollo: conserva los secretos existentes de la API y nunca imprime credenciales.
const apiFile = new URL('../.env', import.meta.url);
const rootFile = new URL('../../../.env', import.meta.url);
if (!existsSync(apiFile))
  throw new Error('Ejecuta pnpm setup:env antes de configurar almacenamiento.');
let content = readFileSync(apiFile, 'utf8');
const api = parseEnv(content);
const local = existsSync(rootFile) ? parseEnv(readFileSync(rootFile, 'utf8')) : {};
const endpoint = api.STORAGE_ENDPOINT || `http://127.0.0.1:${local.MINIO_PORT || '9000'}`;
const url = new URL(endpoint);
if (
  !['http:', 'https:'].includes(url.protocol) ||
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash
)
  throw new Error('Revisa STORAGE_ENDPOINT: debe ser un origen HTTP válido.');
const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
if (!api.STORAGE_ACCESS_KEY && !api.STORAGE_SECRET_KEY && !loopback)
  throw new Error(
    'Configura credenciales STORAGE_* para el endpoint remoto; no se enviarán las credenciales locales.',
  );
const config = {
  STORAGE_ENDPOINT: url.origin,
  STORAGE_REGION: api.STORAGE_REGION || 'us-east-1',
  STORAGE_BUCKET: api.STORAGE_BUCKET || 'creovexa-assets',
  STORAGE_ACCESS_KEY: api.STORAGE_ACCESS_KEY || (loopback ? local.MINIO_ROOT_USER : ''),
  STORAGE_SECRET_KEY: api.STORAGE_SECRET_KEY || (loopback ? local.MINIO_ROOT_PASSWORD : ''),
};
if (
  !config.STORAGE_ACCESS_KEY ||
  !config.STORAGE_SECRET_KEY ||
  !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.STORAGE_BUCKET)
)
  throw new Error('Revisa bucket y credenciales STORAGE_* o las credenciales del MinIO local.');
const client = new S3Client({
  endpoint: config.STORAGE_ENDPOINT,
  region: config.STORAGE_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.STORAGE_ACCESS_KEY,
    secretAccessKey: config.STORAGE_SECRET_KEY,
  },
  maxAttempts: 1,
});
try {
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.STORAGE_BUCKET }), {
      abortSignal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404) throw error;
    await client.send(new CreateBucketCommand({ Bucket: config.STORAGE_BUCKET }), {
      abortSignal: AbortSignal.timeout(10000),
    });
  }
  try {
    await client.send(new GetBucketPolicyCommand({ Bucket: config.STORAGE_BUCKET }), {
      abortSignal: AbortSignal.timeout(10000),
    });
    throw new Error('BUCKET_POLICY_PRESENT');
  } catch (error) {
    if (error?.name !== 'NoSuchBucketPolicy')
      throw new Error(
        'El bucket debe carecer de política pública. Usa un bucket privado dedicado.',
      );
  }
  for (const [key, value] of Object.entries(config)) {
    const line = key + '=' + JSON.stringify(value);
    const pattern = new RegExp('^' + key + '=.*$', 'm');
    if (pattern.test(content)) content = content.replace(pattern, () => line);
    else content = content.trimEnd() + '\n' + line + '\n';
  }
  writeFileSync(apiFile, content, { mode: 0o600 });
  console.log(
    'Bucket privado comprobado. Configuración de almacenamiento guardada en apps/api/.env.',
  );
} catch (error) {
  if (error?.message?.includes('bucket privado')) throw error;
  throw new Error('No se pudo preparar MinIO. Comprueba Docker, endpoint y credenciales.');
} finally {
  client.destroy();
}
