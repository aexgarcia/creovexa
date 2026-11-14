import { createHash } from 'node:crypto';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import {
  inspectImageBytes,
  prepareUploadedImage,
  InvalidImageFileError,
  MAX_IMAGE_BYTES,
} from '#app/infrastructure/image-files';
import type { ObjectStorage } from '#app/modules/assets/application/ports/object-storage';
import type {
  ProductImages,
  ProductImageSelection,
  SavedProductImage,
} from '../application/ports/product-images.js';
import { ProductImageError } from '../application/errors/product-image.error.js';

export class MinioProductImages implements ProductImages {
  constructor(
    private readonly database: PrismaClient,
    private readonly storage: ObjectStorage,
  ) {}

  assertAvailable(): void {
    if (!this.storage.bucket) throw new ProductImageError('UNAVAILABLE');
  }

  async save(
    input: ProductImageSelection & { bytes: Uint8Array; at: Date; expectedUpdatedAt: Date },
  ): Promise<void> {
    const bucket = this.storage.bucket;
    if (!bucket) throw new ProductImageError('UNAVAILABLE');
    try {
      const bytes = await prepareUploadedImage(input.bytes);
      const metadata = await inspectImageBytes(bytes);
      const objectKey = `products/${input.organizationId}/${input.productId}/${input.assetId}`;
      const sha256 = digest(bytes);
      const created = await this.storage.putIfAbsent({
        key: objectKey,
        bytes,
        contentType: metadata.contentType,
        sha256,
      });
      // Asset ids are new per upload, so an occupied key is never this upload's object.
      if (!created) throw new ProductImageError('UNAVAILABLE');
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
    if (!this.storage.bucket || row.bucket !== this.storage.bucket)
      throw new ProductImageError('UNAVAILABLE');
    try {
      const bytes = await this.storage.read(row.objectKey, MAX_IMAGE_BYTES);
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
