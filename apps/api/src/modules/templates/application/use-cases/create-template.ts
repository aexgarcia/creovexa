import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { entityId } from '#app/domain/entity-id';
import { Template } from '../../domain/entities/template.js';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import { TemplateDimensions } from '../../domain/value-objects/template-dimensions.js';
import { TemplateOrganizationNotFoundError } from '../errors/template-organization-not-found.error.js';
import type { OrganizationLookup } from '../ports/organization-lookup.js';
import { templateResult, type TemplateResult } from '../template-result.js';

export interface CreateTemplateInput {
  organizationId: string;
  name: string;
  dimensions: { width: number; height: number };
}

export class CreateTemplate {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly organizations: OrganizationLookup,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateTemplateInput): Promise<TemplateResult> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    if (!(await this.organizations.exists(organizationId))) {
      throw new TemplateOrganizationNotFoundError();
    }
    const template = Template.create(
      this.ids.next(),
      organizationId,
      this.ids.next(),
      {
        name: input.name,
        dimensions: TemplateDimensions.create(input.dimensions.width, input.dimensions.height),
      },
      this.clock.now(),
    );
    await this.templates.add(organizationId, template);
    return templateResult(template);
  }
}
