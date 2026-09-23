import { entityId } from '#app/domain/entity-id';
import { pagination, type Pagination, type Page } from '#app/domain/pagination';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';
import { productResult, type ProductResult } from '../product-result.js';

export class ListProducts {
  constructor(private readonly repository: ProductRepository) {}
  async execute(
    input: { organizationId: string } & Partial<Pagination>,
  ): Promise<Page<ProductResult> & Pagination> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const window = pagination(input);
    const result = await this.repository.list(organizationId, window);
    return { ...window, total: result.total, items: result.items.map(productResult) };
  }
}
