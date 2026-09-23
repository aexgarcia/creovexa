import { entityId } from '#app/domain/entity-id';
import { pagination, type Pagination, type Page } from '#app/domain/pagination';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import { templateResult, type TemplateResult } from '../template-result.js';

export class ListTemplates {
  constructor(private readonly repository: TemplateRepository) {}
  async execute(
    input: { organizationId: string } & Partial<Pagination>,
  ): Promise<Page<TemplateResult> & Pagination> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const window = pagination(input);
    const result = await this.repository.list(organizationId, window);
    return { ...window, total: result.total, items: result.items.map(templateResult) };
  }
}
