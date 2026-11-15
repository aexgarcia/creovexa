import type { EntityId } from '#app/domain/entity-id';
import type { Organization } from '../entities/organization.js';

export interface OrganizationRepository {
  findById(id: EntityId): Promise<Organization | null>;
  /** Solo inserta; un identificador existente no se debe sobrescribir. */
  add(organization: Organization): Promise<void>;
  /** Solo actualiza una organización existente; nunca hace upsert. */
  save(organization: Organization, expectedUpdatedAt?: Date): Promise<void>;
}
