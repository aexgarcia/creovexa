import { createHash } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import type { StorageConfig } from '#app/config/storage.config';
import {
  inspectImageBytes,
  prepareUploadedImage,
  InvalidImageFileError,
  MAX_IMAGE_BYTES,
} from '#app/infrastructure/image-files';
import type {
  OrganizationLogos,
  OrganizationLogoSelection,
  SavedOrganizationLogo,
} from '../application/ports/organization-logos.js';
import { OrganizationLogoError } from '../application/errors/organization-logo.error.js';

export class MinioOrganizationLogos implements OrganizationLogos {
  private readonly client: S3Client | null;
  constructor(
    private readonly database: PrismaClient,
    private readonly config: StorageConfig | null,
  ) {
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
  onModuleDestroy() {
    this.client?.destroy();
  }

  async save(
    input: OrganizationLogoSelection & { bytes: Uint8Array; at: Date; expectedUpdatedAt: Date },
  ): Promise<void> {
    if (!this.client || !this.config) throw new OrganizationLogoError('UNAVAILABLE');
    try {
      const bytes = await prepareUploadedImage(input.bytes);
      const metadata = await inspectImageBytes(bytes);
      const objectKey = `logos/${input.organizationId}/${input.assetId}`;
      const sha256 = digest(bytes);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
          Body: bytes,
          ContentType: metadata.contentType,
          ContentLength: bytes.byteLength,
          IfNoneMatch: '*',
          Metadata: { sha256 },
        }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      const bucket = this.config.bucket;
      await this.database.$transaction(async (tx) => {
        const changed = await tx.organization.updateMany({
          where: { id: input.organizationId, updatedAt: input.expectedUpdatedAt },
          data: { logoAssetId: input.assetId, updatedAt: input.at },
        });
        if (changed.count !== 1) throw new OrganizationLogoError('CONFLICT');
        await tx.organizationLogoAsset.create({
          data: {
            id: input.assetId,
            organizationId: input.organizationId,
            bucket,
            objectKey,
            sha256,
            byteLength: bytes.byteLength,
            ...metadata,
            createdAt: input.at,
          },
        });
      });
      // Replaced logos remain readable for historical snapshots. Never delete after an ambiguous commit.
    } catch (error) {
      if (error instanceof OrganizationLogoError) throw error;
      if (error instanceof InvalidImageFileError) throw new OrganizationLogoError('INVALID_IMAGE');
      throw new OrganizationLogoError('UNAVAILABLE');
    }
  }

  async read(input: OrganizationLogoSelection): Promise<SavedOrganizationLogo | null> {
    const row = await this.database.organizationLogoAsset.findFirst({
      where: { id: input.assetId, organizationId: input.organizationId },
    });
    if (!row) return null;
    if (!this.client || !this.config || row.bucket !== this.config.bucket)
      throw new OrganizationLogoError('UNAVAILABLE');
    try {
      const deadline = AbortSignal.timeout(30_000);
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: row.bucket, Key: row.objectKey }),
        { abortSignal: deadline },
      );
      if (!response.Body || deadline.aborted) throw new OrganizationLogoError('UNAVAILABLE');
      const reader = response.Body.transformToWebStream().getReader();
      const cancel = () => {
        void reader.cancel().catch(() => {});
      };
      deadline.addEventListener('abort', cancel, { once: true });
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (deadline.aborted) throw new OrganizationLogoError('UNAVAILABLE');
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > MAX_IMAGE_BYTES || length > row.byteLength)
            throw new OrganizationLogoError('UNAVAILABLE');
          chunks.push(chunk.value);
        }
      } finally {
        deadline.removeEventListener('abort', cancel);
        await reader.cancel();
        reader.releaseLock();
      }
      const bytes = Buffer.concat(chunks);
      if (bytes.length !== row.byteLength || digest(bytes) !== row.sha256)
        throw new OrganizationLogoError('UNAVAILABLE');
      const metadata = await inspectImageBytes(bytes);
      if (
        metadata.contentType !== row.contentType ||
        metadata.width !== row.width ||
        metadata.height !== row.height
      )
        throw new OrganizationLogoError('UNAVAILABLE');
      return { bytes, ...metadata };
    } catch {
      throw new OrganizationLogoError('UNAVAILABLE');
    }
  }
}
function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
