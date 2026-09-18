import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { Organization } from '../../domain/entities/organization.js';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import { organizationResult, type OrganizationResult } from '../organization-result.js';

export interface CreateOrganizationInput {
  name: string;
  description?: string;
  brandTone?: string | null;
  logoAssetId?: string | null;
}

export class CreateOrganization {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<OrganizationResult> {
    const organization = Organization.create(this.ids.next(), input, this.clock.now());
    await this.organizations.add(organization);
    return organizationResult(organization);
  }
}
