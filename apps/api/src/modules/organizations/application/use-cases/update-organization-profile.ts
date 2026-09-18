import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import { OrganizationNotFoundError } from '../../domain/errors/organization.errors.js';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import { organizationResult, type OrganizationResult } from '../organization-result.js';

export interface UpdateOrganizationProfileInput {
  organizationId: string;
  name?: string;
  description?: string;
  brandTone?: string | null;
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
        logoAssetId: input.logoAssetId,
      },
      this.clock.now(),
    );
    await this.organizations.save(updated);
    return organizationResult(updated);
  }
}
