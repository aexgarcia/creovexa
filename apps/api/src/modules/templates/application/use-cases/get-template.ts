import { entityId } from '#app/domain/entity-id';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import { TemplateNotFoundError } from '../../domain/errors/template.errors.js';
import { templateResult, type TemplateResult } from '../template-result.js';

export class GetTemplate {
  constructor(private readonly repository: TemplateRepository) {}
  async execute(input: { organizationId: string; templateId: string }): Promise<TemplateResult> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const id = entityId(input.templateId, 'templateId');
    const entity = await this.repository.findById(organizationId, id);
    if (!entity || entity.organizationId !== organizationId || entity.id !== id)
      throw new TemplateNotFoundError();
    return templateResult(entity);
  }
}
