import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import { Money } from '#app/domain/value-objects/money';
import { ProductNotFoundError } from '../../domain/errors/product.errors.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';
import { productResult, type ProductResult } from '../product-result.js';

export interface UpdateProductInput {
  organizationId: string;
  productId: string;
  name?: string;
  description?: string;
  regularPrice?: { amountMinor: number; currency: string };
  shortName?: string | null;
  productBrand?: string | null;
  keyAttributes?: readonly string[];
  unit?: string | null;
  benefits?: readonly string[];
  idealFor?: string | null;
  imageAssetIds?: readonly string[];
}

export class UpdateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateProductInput): Promise<ProductResult> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const productId = entityId(input.productId, 'productId');
    const product = await this.products.findById(organizationId, productId);
    if (!product || product.organizationId !== organizationId || product.id !== productId) {
      throw new ProductNotFoundError();
    }

    const updated = product.updateDetails(
      {
        name: input.name,
        description: input.description,
        regularPrice:
          input.regularPrice === undefined
            ? undefined
            : Money.fromMinorUnits(input.regularPrice.amountMinor, input.regularPrice.currency),
        shortName: input.shortName,
        productBrand: input.productBrand,
        keyAttributes: input.keyAttributes,
        unit: input.unit,
        benefits: input.benefits,
        idealFor: input.idealFor,
        imageAssetIds: input.imageAssetIds,
      },
      new Date(Math.max(this.clock.now().getTime(), product.updatedAt.getTime() + 1)),
    );
    await this.products.save(organizationId, updated, product.updatedAt);
    return productResult(updated);
  }
}
