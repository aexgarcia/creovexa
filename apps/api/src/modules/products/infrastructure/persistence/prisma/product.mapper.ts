import type {
  Product as ProductRecord,
  ProductImageAsset,
  ProductKind as StoredProductKind,
} from '#app/infrastructure/persistence/prisma/generated/client';
import { Money } from '#app/domain/value-objects/money';
import { Product } from '../../../domain/entities/product.js';
import { ProductKind } from '../../../domain/product-kind.js';
import { PhotoType } from '../../../domain/photo-type.js';

export type ProductImageTraitsRecord = Pick<ProductImageAsset, 'photoType' | 'hasTransparency'>;

const kinds: Record<StoredProductKind, ProductKind> = {
  PRODUCT: ProductKind.PRODUCT,
  SERVICE: ProductKind.SERVICE,
};

export class ProductMapper {
  /** image: la fila de la imagen actual, si la hay. */
  static toDomain(row: ProductRecord, image: ProductImageTraitsRecord | null = null): Product {
    return Product.restore(
      row.id,
      row.organizationId,
      kinds[row.kind],
      {
        name: row.name,
        description: row.description,
        regularPrice: Money.fromMinorUnits(Number(row.amountMinor), row.currency),
        shortName: row.shortName,
        productBrand: row.productBrand,
        keyAttributes: row.keyAttributes,
        unit: row.unit,
        benefits: row.benefits,
        idealFor: row.idealFor,
        imageAssetIds: row.imageAssetIds,
      },
      row.createdAt,
      row.updatedAt,
      image && {
        photoType: image.photoType && PhotoType[image.photoType],
        hasTransparency: image.hasTransparency,
      },
      row.archivedAt,
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
      shortName: product.shortName,
      productBrand: product.productBrand,
      keyAttributes: [...product.keyAttributes],
      unit: product.unit,
      benefits: [...product.benefits],
      idealFor: product.idealFor,
      imageAssetIds: [...product.imageAssetIds],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      archivedAt: product.archivedAt,
    };
  }
}
