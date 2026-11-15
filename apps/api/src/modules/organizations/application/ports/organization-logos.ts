import type { EntityId } from '#app/domain/entity-id';

export const ORGANIZATION_LOGOS = Symbol('ORGANIZATION_LOGOS');
export interface OrganizationLogoSelection {
  organizationId: EntityId;
  assetId: EntityId;
}
export interface SavedOrganizationLogo {
  bytes: Uint8Array;
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
}
export interface OrganizationLogos {
  save(
    input: OrganizationLogoSelection & { bytes: Uint8Array; at: Date; expectedUpdatedAt: Date },
  ): Promise<void>;
  // Los archivos son inmutables y las lecturas históricas se limitan a su organización.
  read(input: OrganizationLogoSelection): Promise<SavedOrganizationLogo | null>;
}
