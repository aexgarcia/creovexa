import type { EntityId } from '#app/domain/entity-id';

export interface OrganizationLookup {
  exists(organizationId: EntityId): Promise<boolean>;
}
