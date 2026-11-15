import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { StorageConfig } from '#app/config/storage.config';
import {
  ObjectStorageError,
  type ObjectStorage,
  type PutObjectInput,
} from '../application/ports/object-storage.js';

const OPERATION_TIMEOUT_MS = 30_000;

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client | null;

  constructor(private readonly config: StorageConfig | null) {
    this.client = config
      ? new S3Client({
          endpoint: config.endpoint,
          region: config.region,
          forcePathStyle: true,
          credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
          maxAttempts: 2,
        })
      : null;
  }

  get bucket(): string | null {
    return this.config?.bucket ?? null;
  }

  close(): void {
    this.client?.destroy();
  }

  onModuleDestroy(): void {
    this.close();
  }

  async putIfAbsent(input: PutObjectInput): Promise<boolean> {
    const { client, bucket } = this.connection();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: input.key,
          Body: input.bytes,
          ContentType: input.contentType,
          ContentLength: input.bytes.byteLength,
          IfNoneMatch: '*',
          Metadata: { sha256: input.sha256 },
        }),
        { abortSignal: AbortSignal.timeout(OPERATION_TIMEOUT_MS) },
      );
      return true;
    } catch (error) {
      if (isPreconditionFailure(error)) return false;
      throw new ObjectStorageError('UNAVAILABLE');
    }
  }

  async read(key: string, maxBytes: number): Promise<Buffer> {
    const { client, bucket } = this.connection();
    const deadline = AbortSignal.timeout(OPERATION_TIMEOUT_MS);
    let body;
    try {
      body = (
        await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }), {
          abortSignal: deadline,
        })
      ).Body;
    } catch {
      throw new ObjectStorageError('UNAVAILABLE');
    }
    if (!body) throw new ObjectStorageError('EMPTY');
    if (deadline.aborted) throw new ObjectStorageError('TIMEOUT');
    const reader = body.transformToWebStream().getReader();
    const cancel = () => {
      void reader.cancel().catch(() => {});
    };
    deadline.addEventListener('abort', cancel, { once: true });
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (deadline.aborted) throw new ObjectStorageError('TIMEOUT');
        if (done) break;
        length += value.byteLength;
        if (length > maxBytes) throw new ObjectStorageError('TOO_LARGE');
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof ObjectStorageError) throw error;
      throw new ObjectStorageError('UNAVAILABLE');
    } finally {
      deadline.removeEventListener('abort', cancel);
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    return Buffer.concat(chunks);
  }

  private connection(): { client: S3Client; bucket: string } {
    if (!this.client || !this.config) throw new ObjectStorageError('UNAVAILABLE');
    return { client: this.client, bucket: this.config.bucket };
  }
}

function isPreconditionFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    '$metadata' in error &&
    (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 412
  );
}
