import { entityId } from '#app/domain/entity-id';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../../domain/errors/product.errors.js';
import { productResult, type ProductResult } from '../product-result.js';

export class GetProduct {
  constructor(private readonly repository: ProductRepository) {}
  async execute(input: { organizationId: string; productId: string }): Promise<ProductResult> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const id = entityId(input.productId, 'productId');
    const entity = await this.repository.findById(organizationId, id);
    if (!entity || entity.organizationId !== organizationId || entity.id !== id)
      throw new ProductNotFoundError();
    return productResult(entity);
  }
}
