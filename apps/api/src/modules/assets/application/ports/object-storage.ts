export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export type ObjectStorageFailure = 'UNAVAILABLE' | 'TIMEOUT' | 'TOO_LARGE' | 'EMPTY';

export class ObjectStorageError extends Error {
  constructor(readonly code: ObjectStorageFailure) {
    super('No se pudo completar la operación de almacenamiento: ' + code + '.');
    this.name = 'ObjectStorageError';
  }
}

export interface PutObjectInput {
  key: string;
  bytes: Uint8Array;
  contentType: string;
  sha256: string;
}

// Almacenamiento de objetos privado e inmutable, compartido por todo módulo que guarda archivos.
// Cada llamador es dueño de sus filas de metadatos y decide qué significa un objeto guardado.
export interface ObjectStorage {
  // Bucket que recibe los objetos nuevos; null si el almacenamiento no está configurado.
  readonly bucket: string | null;
  // Nunca sobrescribe. Resuelve false si la clave ya tiene un objeto.
  putIfAbsent(input: PutObjectInput): Promise<boolean>;
  // Lee del bucket configurado y falla con TOO_LARGE si supera maxBytes.
  read(key: string, maxBytes: number): Promise<Buffer>;
}
