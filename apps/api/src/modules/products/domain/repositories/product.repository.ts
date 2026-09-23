import type { EntityId } from '#app/domain/entity-id';
import type { Page, Pagination } from '#app/domain/pagination';
import type { Product } from '../entities/product.js';

export interface ProductRepository {
  findById(organizationId: EntityId, productId: EntityId): Promise<Product | null>;
  list(organizationId: EntityId, pagination: Pagination): Promise<Page<Product>>;
  /** Insert only; enforce product.organizationId === organizationId. */
  add(organizationId: EntityId, product: Product): Promise<void>;
  /** Update an existing product in this organization only; never an upsert. */
  save(organizationId: EntityId, product: Product): Promise<void>;
}
