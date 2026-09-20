import type { EntityId } from '#app/domain/entity-id';
import type { OrganizationLookup as ProductOrganizationLookup } from '#app/modules/products/application/ports/organization-lookup';
import type { OrganizationLookup as TemplateOrganizationLookup } from '#app/modules/templates/application/ports/organization-lookup';
import type { PrismaClient } from './generated/client.js';

export class PrismaOrganizationLookup
  implements ProductOrganizationLookup, TemplateOrganizationLookup
{
  constructor(private readonly client: PrismaClient) {}

  async exists(organizationId: EntityId): Promise<boolean> {
    return (
      (await this.client.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      })) !== null
    );
  }
}
