import type { Clock } from '#app/application/ports/clock';
import type { Pagination, Page } from '#app/domain/pagination';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { entityId, type EntityId } from '#app/domain/entity-id';
import type { OrganizationLookup } from '#app/modules/templates/application/ports/organization-lookup';
import { Template } from '#app/modules/templates/domain/entities/template';
import type { TemplateRevision } from '#app/modules/templates/domain/entities/template-revision';
import type { TemplateRepository } from '#app/modules/templates/domain/repositories/template.repository';
import { TemplateDimensions } from '#app/modules/templates/domain/value-objects/template-dimensions';

export const ORGANIZATION_ID = entityId('11111111-1111-4111-8111-111111111111');
export const OTHER_ORGANIZATION_ID = entityId('22222222-2222-4222-8222-222222222222');
export const TEMPLATE_ID = entityId('33333333-3333-4333-8333-333333333333');
export const REVISION_ID = entityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
export const NEXT_REVISION_ID = entityId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
export const CREATED_AT = '2026-09-18T12:00:00.000Z';
export const UPDATED_AT = '2026-09-18T13:00:00.000Z';
export const creationClock: Clock = { now: () => new Date(CREATED_AT) };

export function templateFixture(): Template {
  return Template.create(
    TEMPLATE_ID,
    ORGANIZATION_ID,
    REVISION_ID,
    {
      name: ' Promoción ',
      dimensions: TemplateDimensions.create(1080, 1080),
    },
    creationClock.now(),
  );
}

export class TemplateIdGeneratorFake implements IdGenerator {
  private index = 0;
  constructor(private readonly values: readonly string[] = [TEMPLATE_ID, REVISION_ID]) {}
  next(): string {
    const value = this.values[this.index++];
    if (value === undefined) throw new TypeError('Test identifiers exhausted.');
    return value;
  }
}

export class TemplateOrganizationLookupFake implements OrganizationLookup {
  readonly requestedIds: EntityId[] = [];
  constructor(private readonly ids: readonly EntityId[] = [ORGANIZATION_ID]) {}
  exists(id: EntityId): Promise<boolean> {
    this.requestedIds.push(id);
    return Promise.resolve(this.ids.includes(id));
  }
}

export class TemplateRepositoryFake implements TemplateRepository {
  readonly records = new Map<EntityId, Template>();
  readonly revisions = new Map<EntityId, TemplateRevision>();
  readonly organizationIds: EntityId[] = [];

  findById(organizationId: EntityId, templateId: EntityId): Promise<Template | null> {
    const template = this.records.get(templateId);
    return Promise.resolve(template?.organizationId === organizationId ? template : null);
  }

  list(organizationId: EntityId, { page, limit }: Pagination): Promise<Page<Template>> {
    const rows = [...this.records.values()]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    return Promise.resolve({
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
    });
  }

  add(organizationId: EntityId, template: Template): Promise<void> {
    const revision = template.currentRevision;
    if (
      organizationId !== template.organizationId ||
      revision.organizationId !== organizationId ||
      revision.templateId !== template.id ||
      revision.number !== 1 ||
      this.records.has(template.id) ||
      this.revisions.has(revision.id)
    ) {
      throw new TypeError('Invalid test insert.');
    }
    this.records.set(template.id, template);
    this.revisions.set(revision.id, revision);
    this.organizationIds.push(organizationId);
    return Promise.resolve();
  }
}
