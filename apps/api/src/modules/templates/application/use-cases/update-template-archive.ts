import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import { TemplateNotFoundError } from '../../domain/errors/template.errors.js';
import { templateResult } from '../template-result.js';

export class UpdateTemplateArchive {
  constructor(
    private readonly repository: TemplateRepository,
    private readonly clock: Clock,
  ) {}
  async execute(input: { organizationId: string; id: string; archived: boolean }) {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const id = entityId(input.id);
    const original = await this.repository.findById(organizationId, id);
    if (!original) throw new TemplateNotFoundError();
    const updated = original.withArchiveDate(
      input.archived ? (original.archivedAt ?? this.clock.now()) : null,
    );
    await this.repository.setArchivedAt(organizationId, id, updated.archivedAt);
    const current = await this.repository.findById(organizationId, id);
    if (!current) throw new TemplateNotFoundError();
    return templateResult(current);
  }
}
