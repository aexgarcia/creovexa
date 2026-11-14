import type { EntityId } from '#app/domain/entity-id';

export const PRODUCT_IMAGES = Symbol('PRODUCT_IMAGES');
export interface ProductImageSelection {
  organizationId: EntityId;
  productId: EntityId;
  assetId: EntityId;
}
export interface SavedProductImage {
  bytes: Uint8Array;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
}
export interface ProductImages {
  assertAvailable(): void;
  // Upload immutable bytes, then atomically register metadata and replace the current image.
  save(
    input: ProductImageSelection & { bytes: Uint8Array; at: Date; expectedUpdatedAt: Date },
  ): Promise<void>;
  // Historical reads are allowed for snapshots; always check both owner and product.
  read(input: ProductImageSelection): Promise<SavedProductImage | null>;
}
