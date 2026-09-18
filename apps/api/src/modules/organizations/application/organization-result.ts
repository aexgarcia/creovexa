import type { Organization } from '../domain/entities/organization.js';

export interface OrganizationResult {
  id: string;
  name: string;
  description: string;
  brandTone: string | null;
  logoAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function organizationResult(organization: Organization): OrganizationResult {
  return {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    brandTone: organization.brandTone,
    logoAssetId: organization.logoAssetId,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}
