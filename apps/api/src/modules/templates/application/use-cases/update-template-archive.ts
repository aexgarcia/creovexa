import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import { TemplateNotFoundError } from '../../domain/errors/template.errors.js';
import { templateResult } from '../template-result.js';
import { PlanResource, type PlanLimits } from '#app/modules/plans/contract';

export class UpdateTemplateArchive {
  constructor(
    private readonly repository: TemplateRepository,
    private readonly clock: Clock,
    private readonly limits: PlanLimits,
  ) {}
  async execute(input: { organizationId: string; id: string; archived: boolean }) {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const id = entityId(input.id);
    const original = await this.repository.findById(organizationId, id);
    if (!original) throw new TemplateNotFoundError();
    // Restaurar vuelve a sumar una plantilla activa (ADR-0033).
    if (!input.archived && original.archivedAt)
      await this.limits.assertCanCreate(organizationId, PlanResource.TEMPLATE);
    const updated = original.withArchiveDate(
      input.archived ? (original.archivedAt ?? this.clock.now()) : null,
    );
    await this.repository.setArchivedAt(organizationId, id, updated.archivedAt);
    const current = await this.repository.findById(organizationId, id);
    if (!current) throw new TemplateNotFoundError();
    return templateResult(current);
  }
}
