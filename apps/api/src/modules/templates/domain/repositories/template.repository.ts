import type { EntityId } from '#app/domain/entity-id';
import type { Template } from '../entities/template.js';

export interface TemplateRepository {
  /**
   * Atomically insert a new template and its initial revision, scoped to organizationId.
   * Reject existing identities; never overwrite a template or revision.
   */
  add(organizationId: EntityId, template: Template): Promise<void>;
}
