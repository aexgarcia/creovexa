import { entityId } from '#app/domain/entity-id';
import type { GenerationResources } from '../domain/value-objects/generation-snapshot.js';
import {
  CampaignResource,
  CampaignResourceNotFoundError,
} from './errors/campaign-resource-not-found.error.js';
import type { CampaignLookups } from './ports/campaign-lookups.js';

export interface CampaignReferences {
  organizationId: string;
  productId: string;
  templateId: string;
  templateRevisionId: string;
}

export async function loadCampaignResources(
  references: CampaignReferences,
  lookups: CampaignLookups,
): Promise<GenerationResources> {
  const organizationId = entityId(references.organizationId, 'organizationId');
  const productId = entityId(references.productId, 'productId');
  const templateId = entityId(references.templateId, 'templateId');
  const revisionId = entityId(references.templateRevisionId, 'templateRevisionId');
  const organization = await lookups.organizations.findById(organizationId);
  if (!organization || entityId(organization.id) !== organizationId) {
    throw new CampaignResourceNotFoundError(CampaignResource.ORGANIZATION);
  }
  const [product, template] = await Promise.all([
    lookups.products.findById(organizationId, productId),
    lookups.templates.findRevision(organizationId, templateId, revisionId),
  ]);
  if (
    !product ||
    entityId(product.organizationId) !== organizationId ||
    entityId(product.id) !== productId
  ) {
    throw new CampaignResourceNotFoundError(CampaignResource.PRODUCT);
  }
  if (
    !template ||
    entityId(template.organizationId) !== organizationId ||
    entityId(template.id) !== templateId ||
    entityId(template.revisionId) !== revisionId
  ) {
    throw new CampaignResourceNotFoundError(CampaignResource.TEMPLATE_REVISION);
  }
  return { organization, product, template };
}
