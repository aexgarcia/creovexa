import type { Currency } from '#app/domain/value-objects/money';
import type { Product } from '../domain/entities/product.js';
import type { ProductKind } from '../domain/product-kind.js';
import type { PhotoType } from '../domain/photo-type.js';

export interface ProductResult {
  id: string;
  organizationId: string;
  kind: ProductKind;
  name: string;
  description: string;
  regularPrice: { amountMinor: number; currency: Currency };
  shortName: string | null;
  productBrand: string | null;
  keyAttributes: string[];
  unit: string | null;
  imageAssetIds: string[];
  image: { photoType: PhotoType | null; hasTransparency: boolean | null } | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export function productResult(product: Product): ProductResult {
  return {
    id: product.id,
    organizationId: product.organizationId,
    kind: product.kind,
    name: product.name,
    description: product.description,
    regularPrice: {
      amountMinor: product.regularPrice.amountMinor,
      currency: product.regularPrice.currency,
    },
    shortName: product.shortName,
    productBrand: product.productBrand,
    keyAttributes: [...product.keyAttributes],
    unit: product.unit,
    imageAssetIds: [...product.imageAssetIds],
    image: product.imageTraits && { ...product.imageTraits },
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    archivedAt: product.archivedAt?.toISOString() ?? null,
  };
}
