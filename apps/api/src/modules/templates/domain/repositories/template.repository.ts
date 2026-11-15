import type { EntityId } from '#app/domain/entity-id';
import type { Page, Pagination } from '#app/domain/pagination';
import type { Template } from '../entities/template.js';

export interface TemplateRepository {
  setArchivedAt(organizationId: EntityId, id: EntityId, at: Date | null): Promise<void>;
  findById(organizationId: EntityId, templateId: EntityId): Promise<Template | null>;
  list(
    organizationId: EntityId,
    pagination: Pagination,
    status?: 'active' | 'archived' | 'all',
  ): Promise<Page<Template>>;
  /**
   * Inserta de forma atómica una plantilla nueva y su revisión inicial, dentro de organizationId.
   * Rechaza identidades existentes; nunca sobrescribe una plantilla ni una revisión.
   */
  save(organizationId: EntityId, template: Template, expectedRevisionId: EntityId): Promise<void>;
  add(organizationId: EntityId, template: Template): Promise<void>;
}
