import type { EntityId } from '#app/domain/entity-id';
import type { Page, Pagination } from '#app/domain/pagination';
import type { Template } from '../entities/template.js';

export interface TemplateRepository {
  findById(organizationId: EntityId, templateId: EntityId): Promise<Template | null>;
  list(organizationId: EntityId, pagination: Pagination): Promise<Page<Template>>;
  /**
   * Atomically insert a new template and its initial revision, scoped to organizationId.
   * Reject existing identities; never overwrite a template or revision.
   */
  add(organizationId: EntityId, template: Template): Promise<void>;
}
