import type { EntityId } from '#app/domain/entity-id';
import { pagination, type Page, type Pagination } from '#app/domain/pagination';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import {
  PersistenceScopeError,
  PersistenceConflictError,
} from '#app/infrastructure/persistence/persistence.errors';
import type { Product } from '../../../domain/entities/product.js';
import type { ProductRepository } from '../../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../../../domain/errors/product.errors.js';
import { ProductMapper } from './product.mapper.js';

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly client: PrismaClient) {}

  async setArchivedAt(organizationId: EntityId, id: EntityId, at: Date | null): Promise<void> {
    const changed = await this.client.product.updateMany({
      where: { organizationId, id, archivedAt: at === null ? { not: null } : null },
      data: { archivedAt: at },
    });
    if (!changed.count && !(await this.findById(organizationId, id)))
      throw new ProductNotFoundError();
  }

  async findById(organizationId: EntityId, productId: EntityId): Promise<Product | null> {
    const row = await this.client.product.findUnique({
      where: { organizationId_id: { organizationId, id: productId } },
    });
    if (!row) return null;
    const [image] = await this.currentImages(organizationId, row.imageAssetIds);
    return ProductMapper.toDomain(row, image ?? null);
  }

  // Los datos de las imágenes actuales, en una sola consulta.
  private async currentImages(
    organizationId: EntityId,
    ids: readonly string[],
    client: Pick<PrismaClient, 'productImageAsset'> = this.client,
  ) {
    if (!ids.length) return [];
    return client.productImageAsset.findMany({
      where: { organizationId, id: { in: [...ids] } },
      select: { id: true, photoType: true, hasTransparency: true },
    });
  }

  async add(organizationId: EntityId, product: Product): Promise<void> {
    if (product.organizationId !== organizationId) throw new PersistenceScopeError();
    try {
      await this.client.product.create({ data: ProductMapper.toPersistence(product) });
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async list(
    organizationId: EntityId,
    input: Pagination,
    status: 'active' | 'archived' | 'all' = 'active',
  ): Promise<Page<Product>> {
    const { page, limit } = pagination(input);
    return this.client.$transaction(
      async (tx) => {
        const where = {
          organizationId,
          ...(status === 'all' ? {} : { archivedAt: status === 'archived' ? { not: null } : null }),
        };
        const rows = await tx.product.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        const total = await tx.product.count({ where });
        const images = new Map(
          (
            await this.currentImages(
              organizationId,
              rows.flatMap((row) => row.imageAssetIds),
              tx,
            )
          ).map((image) => [image.id, image]),
        );
        return {
          items: rows.map((row) =>
            ProductMapper.toDomain(row, images.get(row.imageAssetIds[0] ?? '') ?? null),
          ),
          total,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async save(organizationId: EntityId, product: Product, expectedUpdatedAt?: Date): Promise<void> {
    if (product.organizationId !== organizationId) throw new PersistenceScopeError();
    const row = ProductMapper.toPersistence(product);
    const result = await this.client.product.updateMany({
      where: {
        id: row.id,
        organizationId,
        ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
      },
      data: {
        name: row.name,
        description: row.description,
        amountMinor: row.amountMinor,
        currency: row.currency,
        shortName: row.shortName,
        productBrand: row.productBrand,
        keyAttributes: row.keyAttributes,
        unit: row.unit,
        benefits: row.benefits,
        idealFor: row.idealFor,
        imageAssetIds: row.imageAssetIds,
        updatedAt: row.updatedAt,
      },
    });
    if (result.count !== 1) {
      if (expectedUpdatedAt && (await this.findById(organizationId, product.id)))
        throw new PersistenceConflictError();
      throw new ProductNotFoundError();
    }
  }
}
