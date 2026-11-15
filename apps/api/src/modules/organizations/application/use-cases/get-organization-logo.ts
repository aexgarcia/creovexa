import { entityId } from '#app/domain/entity-id';
import type { OrganizationLogos } from '../ports/organization-logos.js';
import { OrganizationLogoError } from '../errors/organization-logo.error.js';

export class GetOrganizationLogo {
  constructor(private readonly logos: OrganizationLogos) {}
  async execute(input: { organizationId: string; assetId: string }) {
    const logo = await this.logos.read({
      organizationId: entityId(input.organizationId),
      assetId: entityId(input.assetId),
    });
    if (!logo) throw new OrganizationLogoError('NOT_FOUND');
    return logo;
  }
}
