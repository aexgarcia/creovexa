import type { EntityId } from '#app/domain/entity-id';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import type { Organization } from '../../../domain/entities/organization.js';
import type { OrganizationRepository } from '../../../domain/repositories/organization.repository.js';
import { OrganizationNotFoundError } from '../../../domain/errors/organization.errors.js';
import { OrganizationMapper } from './organization.mapper.js';

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(id: EntityId): Promise<Organization | null> {
    const row = await this.client.organization.findUnique({ where: { id } });
    return row ? OrganizationMapper.toDomain(row) : null;
  }

  async add(organization: Organization): Promise<void> {
    try {
      await this.client.organization.create({
        data: OrganizationMapper.toPersistence(organization),
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async save(organization: Organization): Promise<void> {
    const row = OrganizationMapper.toPersistence(organization);
    const result = await this.client.organization.updateMany({
      where: { id: row.id },
      data: {
        name: row.name,
        description: row.description,
        brandTone: row.brandTone,
        logoAssetId: row.logoAssetId,
        updatedAt: row.updatedAt,
      },
    });
    if (result.count !== 1) throw new OrganizationNotFoundError();
  }
}
