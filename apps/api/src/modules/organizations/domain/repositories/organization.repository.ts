import type { EntityId } from '#app/domain/entity-id';
import type { Organization } from '../entities/organization.js';

export interface OrganizationRepository {
  findById(id: EntityId): Promise<Organization | null>;
  /** Insert only; an existing identifier must not be overwritten. */
  add(organization: Organization): Promise<void>;
  /** Update an existing organization only; never an upsert. */
  save(organization: Organization): Promise<void>;
}
