import type { EntityId } from '#app/domain/entity-id';
import type { PhotoType } from '../../domain/photo-type.js';

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
  // Guarda con la imagen el tipo de foto que indicó el usuario y si tiene transparencia.
  save(
    input: ProductImageSelection & {
      bytes: Uint8Array;
      photoType: PhotoType;
      at: Date;
      expectedUpdatedAt: Date;
    },
  ): Promise<void>;
  // Se permiten lecturas históricas para los snapshots; siempre comprueba el dueño y el producto.
  read(input: ProductImageSelection): Promise<SavedProductImage | null>;
}
