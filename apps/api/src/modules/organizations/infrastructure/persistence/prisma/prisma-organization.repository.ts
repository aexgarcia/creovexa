import type { EntityId } from '#app/domain/entity-id';
import { Prisma, type PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import type { Organization } from '../../../domain/entities/organization.js';
import type { OrganizationRepository } from '../../../domain/repositories/organization.repository.js';
import {
  OrganizationNotFoundError,
  OrganizationProfileConflictError,
} from '../../../domain/errors/organization.errors.js';
import { OrganizationMapper } from './organization.mapper.js';

export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(private readonly client: PrismaClient) {}

  async findById(id: EntityId): Promise<Organization | null> {
    const row = await this.client.organization.findUnique({ where: { id } });
    if (!row) return null;
    const logo = row.logoAssetId
      ? await this.client.organizationLogoAsset.findFirst({
          where: { id: row.logoAssetId, organizationId: row.id },
          select: { isDark: true, suggestedColors: true },
        })
      : null;
    return OrganizationMapper.toDomain(row, logo);
  }

  async add(organization: Organization): Promise<void> {
    try {
      const row = OrganizationMapper.toPersistence(organization);
      await this.client.organization.create({
        data: { ...row, brandColors: row.brandColors ?? Prisma.DbNull },
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async save(organization: Organization, expectedUpdatedAt?: Date): Promise<void> {
    const row = OrganizationMapper.toPersistence(organization);
    const result = await this.client.organization.updateMany({
      where: { id: row.id, updatedAt: expectedUpdatedAt },
      data: {
        name: row.name,
        description: row.description,
        brandTone: row.brandTone,
        industry: row.industry,
        country: row.country,
        locale: row.locale,
        timeZone: row.timeZone,
        defaultCurrency: row.defaultCurrency,
        brandColors: row.brandColors ?? Prisma.DbNull,
        logoAssetId: row.logoAssetId,
        updatedAt: row.updatedAt,
      },
    });
    if (result.count !== 1) {
      if (
        !(await this.client.organization.findUnique({
          where: { id: row.id },
          select: { id: true },
        }))
      )
        throw new OrganizationNotFoundError();
      throw new OrganizationProfileConflictError();
    }
  }
}
