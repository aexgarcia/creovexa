import type {
  Product as ProductRecord,
  ProductKind as StoredProductKind,
} from '#app/infrastructure/persistence/prisma/generated/client';
import { Money } from '#app/domain/value-objects/money';
import { Product } from '../../../domain/entities/product.js';
import { ProductKind } from '../../../domain/product-kind.js';

const kinds: Record<StoredProductKind, ProductKind> = {
  PRODUCT: ProductKind.PRODUCT,
  SERVICE: ProductKind.SERVICE,
};

export class ProductMapper {
  static toDomain(row: ProductRecord): Product {
    return Product.restore(
      row.id,
      row.organizationId,
      kinds[row.kind],
      {
        name: row.name,
        description: row.description,
        regularPrice: Money.fromMinorUnits(Number(row.amountMinor), row.currency),
        imageAssetIds: row.imageAssetIds,
      },
      row.createdAt,
      row.updatedAt,
    );
  }

  static toPersistence(product: Product): ProductRecord {
    return {
      id: product.id,
      organizationId: product.organizationId,
      kind: product.kind,
      name: product.name,
      description: product.description,
      amountMinor: BigInt(product.regularPrice.amountMinor),
      currency: product.regularPrice.currency,
      imageAssetIds: [...product.imageAssetIds],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
