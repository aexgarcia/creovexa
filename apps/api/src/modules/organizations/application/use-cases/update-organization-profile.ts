import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import { OrganizationNotFoundError } from '../../domain/errors/organization.errors.js';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import type { BrandColors } from '../../domain/value-objects/brand-colors.js';
import type { RegionInput } from '../../domain/value-objects/region.js';
import type { ContactInput, Typography } from '../../domain/value-objects/brand-voice.js';
import { organizationResult, type OrganizationResult } from '../organization-result.js';

export interface UpdateOrganizationProfileInput {
  organizationId: string;
  name?: string;
  description?: string;
  brandTone?: string | null;
  industry?: string | null;
  region?: RegionInput;
  brandColors?: BrandColors | null;
  typography?: Typography | null;
  visualStyle?: readonly string[];
  contact?: ContactInput | null;
  defaultLegalText?: string | null;
  forbiddenWords?: readonly string[];
  logoAssetId?: string | null;
}

export class UpdateOrganizationProfile {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateOrganizationProfileInput): Promise<OrganizationResult> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const organization = await this.organizations.findById(organizationId);
    if (!organization || organization.id !== organizationId) throw new OrganizationNotFoundError();

    const updated = organization.updateProfile(
      {
        name: input.name,
        description: input.description,
        brandTone: input.brandTone,
        industry: input.industry,
        region: input.region,
        brandColors: input.brandColors,
        typography: input.typography,
        visualStyle: input.visualStyle,
        contact: input.contact,
        defaultLegalText: input.defaultLegalText,
        forbiddenWords: input.forbiddenWords,
        logoAssetId: input.logoAssetId,
      },
      new Date(Math.max(this.clock.now().getTime(), organization.updatedAt.getTime() + 1)),
    );
    await this.organizations.save(updated, organization.updatedAt);
    return organizationResult(updated);
  }
}
