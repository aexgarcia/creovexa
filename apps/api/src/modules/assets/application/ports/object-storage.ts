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

// Private, immutable object storage shared by every module that keeps files.
// Callers own their metadata rows and decide what a stored object means.
export interface ObjectStorage {
  // Bucket that receives new objects; null when storage is not configured.
  readonly bucket: string | null;
  // Never overwrites. Resolves false when the key already holds an object.
  putIfAbsent(input: PutObjectInput): Promise<boolean>;
  // Reads from the configured bucket and fails with TOO_LARGE beyond maxBytes.
  read(key: string, maxBytes: number): Promise<Buffer>;
}
