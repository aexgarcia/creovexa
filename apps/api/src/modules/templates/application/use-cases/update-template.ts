import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { entityId } from '#app/domain/entity-id';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import {
  TemplateNotFoundError,
  TemplateRevisionConflictError,
} from '../../domain/errors/template.errors.js';
import { templateResult } from '../template-result.js';
export class UpdateTemplate {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  async execute(input: {
    organizationId: string;
    templateId: string;
    expectedRevisionId: string;
    name: string;
  }) {
    const owner = entityId(input.organizationId),
      id = entityId(input.templateId),
      expected = entityId(input.expectedRevisionId);
    const current = await this.templates.findById(owner, id);
    if (!current || current.organizationId !== owner) throw new TemplateNotFoundError();
    if (current.currentRevision.id !== expected) throw new TemplateRevisionConflictError();
    const updated = current.revise(this.ids.next(), input.name, this.clock.now());
    await this.templates.save(owner, updated, expected);
    return templateResult(updated);
  }
}
