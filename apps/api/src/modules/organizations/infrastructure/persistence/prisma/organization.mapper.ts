import type { Organization as OrganizationRecord } from '#app/infrastructure/persistence/prisma/generated/client';
import { Organization } from '../../../domain/entities/organization.js';

export class OrganizationMapper {
  static toDomain(row: OrganizationRecord): Organization {
    return Organization.restore(
      row.id,
      {
        name: row.name,
        description: row.description,
        brandTone: row.brandTone,
        logoAssetId: row.logoAssetId,
      },
      row.createdAt,
      row.updatedAt,
    );
  }

  static toPersistence(organization: Organization): OrganizationRecord {
    return {
      id: organization.id,
      name: organization.name,
      description: organization.description,
      brandTone: organization.brandTone,
      logoAssetId: organization.logoAssetId,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
