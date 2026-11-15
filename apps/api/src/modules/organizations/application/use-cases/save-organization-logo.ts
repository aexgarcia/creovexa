import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import type { OrganizationRepository } from '../../domain/repositories/organization.repository.js';
import { OrganizationNotFoundError } from '../../domain/errors/organization.errors.js';
import { OrganizationLogoError } from '../errors/organization-logo.error.js';
import type { OrganizationLogos } from '../ports/organization-logos.js';
import { organizationResult } from '../organization-result.js';

export class SaveOrganizationLogo {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly logos: OrganizationLogos,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  async execute(input: { organizationId: string; bytes: Uint8Array }) {
    const organizationId = entityId(input.organizationId);
    const organization = await this.organizations.findById(organizationId);
    if (!organization || organization.id !== organizationId) throw new OrganizationNotFoundError();
    if (!(input.bytes instanceof Uint8Array) || !input.bytes.byteLength)
      throw new OrganizationLogoError('INVALID_IMAGE');
    if (input.bytes.byteLength > 10 * 1024 * 1024) throw new OrganizationLogoError('TOO_LARGE');
    const at = new Date(Math.max(this.clock.now().getTime(), organization.updatedAt.getTime() + 1));
    await this.logos.save({
      organizationId,
      assetId: entityId(this.ids.next()),
      bytes: input.bytes,
      at,
      expectedUpdatedAt: organization.updatedAt,
    });
    const saved = await this.organizations.findById(organizationId);
    if (!saved || saved.id !== organizationId) throw new OrganizationNotFoundError();
    return organizationResult(saved);
  }
}
