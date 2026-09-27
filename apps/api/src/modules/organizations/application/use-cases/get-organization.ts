import { entityId } from '#app/domain/entity-id';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import { OrganizationNotFoundError } from '../../domain/errors/organization.errors.js';
import { organizationResult, type OrganizationResult } from '../organization-result.js';
export class GetOrganization {
  constructor(private readonly organizations: OrganizationRepository) {}
  async execute(input: { organizationId: string }): Promise<OrganizationResult> {
    const id = entityId(input.organizationId, 'organizationId');
    const organization = await this.organizations.findById(id);
    if (!organization || organization.id !== id) throw new OrganizationNotFoundError();
    return organizationResult(organization);
  }
}
