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
  ProductImages,
  ProductImageSelection,
  SavedProductImage,
} from '../application/ports/product-images.js';
import { ProductImageError } from '../application/errors/product-image.error.js';

export class MinioProductImages implements ProductImages {
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
  assertAvailable(): void {
    if (!this.client || !this.config) throw new ProductImageError('UNAVAILABLE');
  }

  async save(
    input: ProductImageSelection & { bytes: Uint8Array; at: Date; expectedUpdatedAt: Date },
  ): Promise<void> {
    if (!this.client || !this.config) throw new ProductImageError('UNAVAILABLE');
    try {
      const bytes = await prepareUploadedImage(input.bytes);
      const metadata = await inspectImageBytes(bytes);
      const objectKey = `products/${input.organizationId}/${input.productId}/${input.assetId}`;
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
        const result = await tx.product.updateMany({
          where: {
            id: input.productId,
            organizationId: input.organizationId,
            updatedAt: input.expectedUpdatedAt,
          },
          data: { imageAssetIds: [input.assetId], updatedAt: input.at },
        });
        if (result.count !== 1) throw new ProductImageError('CONFLICT');
        await tx.productImageAsset.create({
          data: {
            id: input.assetId,
            organizationId: input.organizationId,
            productId: input.productId,
            bucket,
            objectKey,
            sha256,
            byteLength: bytes.byteLength,
            ...metadata,
            createdAt: input.at,
          },
        });
      });
      // Do not delete after an ambiguous commit; earlier images stay readable for snapshots.
    } catch (error) {
      if (error instanceof ProductImageError) throw error;
      if (error instanceof InvalidImageFileError) throw new ProductImageError('INVALID_IMAGE');
      throw new ProductImageError('UNAVAILABLE');
    }
  }

  async read(input: ProductImageSelection): Promise<SavedProductImage | null> {
    const row = await this.database.productImageAsset.findFirst({
      where: {
        id: input.assetId,
        organizationId: input.organizationId,
        productId: input.productId,
      },
    });
    if (!row) return null;
    if (!this.client || !this.config || row.bucket !== this.config.bucket)
      throw new ProductImageError('UNAVAILABLE');
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: row.bucket, Key: row.objectKey }),
        { abortSignal: AbortSignal.timeout(30_000) },
      );
      if (!response.Body) throw new ProductImageError('UNAVAILABLE');
      const reader = response.Body.transformToWebStream().getReader();
      const chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          length += chunk.value.byteLength;
          if (length > MAX_IMAGE_BYTES) throw new ProductImageError('UNAVAILABLE');
          chunks.push(chunk.value);
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      const bytes = Buffer.concat(chunks);
      if (bytes.length !== row.byteLength || digest(bytes) !== row.sha256)
        throw new ProductImageError('UNAVAILABLE');
      return {
        bytes,
        contentType: row.contentType as SavedProductImage['contentType'],
        width: row.width,
        height: row.height,
      };
    } catch {
      throw new ProductImageError('UNAVAILABLE');
    }
  }
}

function digest(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}
