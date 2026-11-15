export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const STORAGE_CONFIG = Symbol('STORAGE_CONFIG');
export function readOptionalStorageConfig(environment: NodeJS.ProcessEnv): StorageConfig | null {
  if (!environment.STORAGE_ACCESS_KEY && !environment.STORAGE_SECRET_KEY) return null;
  return readStorageConfig(environment);
}

// La llama la fábrica del adapter cuando el almacenamiento de imágenes está activo; nunca registres este objeto en logs.
export function readStorageConfig(environment: NodeJS.ProcessEnv): StorageConfig {
  try {
    const endpoint = new URL(environment.STORAGE_ENDPOINT ?? '');
    const bucket = environment.STORAGE_BUCKET ?? '';
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.pathname !== '/' ||
      endpoint.search ||
      endpoint.hash ||
      !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
      !environment.STORAGE_ACCESS_KEY ||
      !environment.STORAGE_SECRET_KEY
    )
      throw new Error();
    return {
      endpoint: endpoint.origin,
      region: environment.STORAGE_REGION?.trim() || 'us-east-1',
      bucket,
      accessKeyId: environment.STORAGE_ACCESS_KEY,
      secretAccessKey: environment.STORAGE_SECRET_KEY,
    };
  } catch {
    throw new Error('Configuración de almacenamiento inválida: revisa las variables STORAGE_*.');
  }
}
