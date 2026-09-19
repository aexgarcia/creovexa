import type { EntityId } from '#app/domain/entity-id';
import type { GenerationResources } from '../../domain/value-objects/generation-snapshot.js';

export interface OrganizationLookup {
  findById(organizationId: EntityId): Promise<GenerationResources['organization'] | null>;
}

export interface ProductLookup {
  findById(
    organizationId: EntityId,
    productId: EntityId,
  ): Promise<GenerationResources['product'] | null>;
}

export interface TemplateRevisionLookup {
  findRevision(
    organizationId: EntityId,
    templateId: EntityId,
    revisionId: EntityId,
  ): Promise<GenerationResources['template'] | null>;
}

export interface CampaignLookups {
  organizations: OrganizationLookup;
  products: ProductLookup;
  templates: TemplateRevisionLookup;
}
