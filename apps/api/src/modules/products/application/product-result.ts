import type { Currency } from '#app/domain/value-objects/money';
import type { Product } from '../domain/entities/product.js';
import type { ProductKind } from '../domain/product-kind.js';

export interface ProductResult {
  id: string;
  organizationId: string;
  kind: ProductKind;
  name: string;
  description: string;
  regularPrice: { amountMinor: number; currency: Currency };
  imageAssetIds: string[];
  createdAt: string;
  updatedAt: string;
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
    imageAssetIds: [...product.imageAssetIds],
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
