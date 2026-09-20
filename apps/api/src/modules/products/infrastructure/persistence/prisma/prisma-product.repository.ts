import type { EntityId } from '#app/domain/entity-id';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import { PersistenceScopeError } from '#app/infrastructure/persistence/persistence.errors';
import type { Product } from '../../../domain/entities/product.js';
import type { ProductRepository } from '../../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../../../domain/errors/product.errors.js';
import { ProductMapper } from './product.mapper.js';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(organizationId: EntityId, productId: EntityId): Promise<Product | null> {
    const row = await this.client.product.findUnique({
      where: { organizationId_id: { organizationId, id: productId } },
    });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async add(organizationId: EntityId, product: Product): Promise<void> {
    if (product.organizationId !== organizationId) throw new PersistenceScopeError();
    try {
      await this.client.product.create({ data: ProductMapper.toPersistence(product) });
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async save(organizationId: EntityId, product: Product): Promise<void> {
    if (product.organizationId !== organizationId) throw new PersistenceScopeError();
    const row = ProductMapper.toPersistence(product);
    const result = await this.client.product.updateMany({
      where: { id: row.id, organizationId },
      data: {
        name: row.name,
        description: row.description,
        amountMinor: row.amountMinor,
        currency: row.currency,
        imageAssetIds: row.imageAssetIds,
        updatedAt: row.updatedAt,
      },
    });
    if (result.count !== 1) throw new ProductNotFoundError();
  }
}
