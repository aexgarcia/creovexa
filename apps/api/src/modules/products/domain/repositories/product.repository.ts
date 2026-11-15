import type { EntityId } from '#app/domain/entity-id';
import type { Page, Pagination } from '#app/domain/pagination';
import type { Product } from '../entities/product.js';

export interface ProductRepository {
  setArchivedAt(organizationId: EntityId, id: EntityId, at: Date | null): Promise<void>;
  findById(organizationId: EntityId, productId: EntityId): Promise<Product | null>;
  list(
    organizationId: EntityId,
    pagination: Pagination,
    status?: 'active' | 'archived' | 'all',
  ): Promise<Page<Product>>;
  /** Solo inserta; exige product.organizationId === organizationId. */
  add(organizationId: EntityId, product: Product): Promise<void>;
  /** Solo actualiza un producto existente de esta organización; nunca hace upsert. */
  save(organizationId: EntityId, product: Product, expectedUpdatedAt?: Date): Promise<void>;
}
