import type { Organization } from '../domain/entities/organization.js';
import type { BrandColors } from '../domain/value-objects/brand-colors.js';
import type { Region } from '../domain/value-objects/region.js';

export interface OrganizationResult {
  id: string;
  name: string;
  description: string;
  brandTone: string | null;
  industry: string | null;
  region: Region;
  brandColors: BrandColors | null;
  effectiveBrandColors: BrandColors | null;
  logoAssetId: string | null;
  logoTraits: { isDark: boolean; suggestedColors: BrandColors } | null;
  createdAt: string;
  updatedAt: string;
}

export function organizationResult(organization: Organization): OrganizationResult {
  const traits = organization.logoTraits;
  return {
    id: organization.id,
    name: organization.name,
    description: organization.description,
    brandTone: organization.brandTone,
    industry: organization.industry,
    region: { ...organization.region },
    brandColors: organization.brandColors && { ...organization.brandColors },
    effectiveBrandColors: organization.effectiveBrandColors && {
      ...organization.effectiveBrandColors,
    },
    logoAssetId: organization.logoAssetId,
    logoTraits: traits && { isDark: traits.isDark, suggestedColors: { ...traits.suggestedColors } },
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}
