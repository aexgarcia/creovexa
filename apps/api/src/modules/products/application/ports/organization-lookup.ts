import type { EntityId } from '#app/domain/entity-id';

// Lo que necesita la sugerencia de datos de venta sobre la marca (ADR-0031).
export interface OrganizationSalesContext {
  name: string;
  description: string;
  industry: string | null;
  brandTone: string | null;
  audience: string | null;
  region: { country: string; locale: string };
}

export interface OrganizationLookup {
  exists(organizationId: EntityId): Promise<boolean>;
  /** null si la organización no existe. */
  salesContext(organizationId: EntityId): Promise<OrganizationSalesContext | null>;
}
