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
  // Sube bytes inmutables y luego, de forma atómica, registra los metadatos y reemplaza la imagen actual.
  save(
    input: ProductImageSelection & { bytes: Uint8Array; at: Date; expectedUpdatedAt: Date },
  ): Promise<void>;
  // Se permiten lecturas históricas para los snapshots; siempre comprueba el dueño y el producto.
  read(input: ProductImageSelection): Promise<SavedProductImage | null>;
}
