import { PlanFake } from '../../../../support/plan-fakes.js';
import { FlyerDesign, InvalidFlyerDesignError } from '#app/domain/value-objects/flyer-design';
import {
  CreateTemplate,
  type CreateTemplateInput,
} from '#app/modules/templates/application/use-cases/create-template';
import { TemplateOrganizationNotFoundError } from '#app/modules/templates/application/errors/template-organization-not-found.error';
import { Template } from '#app/modules/templates/domain/entities/template';
import { TemplateRevision } from '#app/modules/templates/domain/entities/template-revision';
import { InvalidTemplateNameError } from '#app/modules/templates/domain/errors/template.errors';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import { InvalidTimestampError } from '#app/domain/timestamp';
import {
  TemplateRepositoryFake,
  TemplateOrganizationLookupFake,
  TemplateIdGeneratorFake,
  TEMPLATE_ID,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  REVISION_ID,
  CREATED_AT,
  creationClock,
} from '../../../../support/template-fakes.js';

function input(): CreateTemplateInput {
  return {
    organizationId: ORGANIZATION_ID,
    name: ' Promoción ',
  };
}

function setup(organizations = new TemplateOrganizationLookupFake()) {
  const repository = new TemplateRepositoryFake();
  const useCase = new CreateTemplate(
    repository,
    organizations,
    new TemplateIdGeneratorFake(),
    creationClock,
    new PlanFake(),
  );
  return { repository, useCase, organizations };
}

describe('CreateTemplate', () => {
  it('stores a template and its initial revision and returns plain application data', async () => {
    const { repository, useCase, organizations } = setup();

    const result = await useCase.execute(input());

    expect(result).toEqual({
      archivedAt: null,
      id: TEMPLATE_ID,
      organizationId: ORGANIZATION_ID,
      name: 'Promoción',
      currentRevision: {
        design: FlyerDesign.create().data,
        id: REVISION_ID,
        templateId: TEMPLATE_ID,
        organizationId: ORGANIZATION_ID,
        number: 1,
        dimensions: { width: 1080, height: 1080 },
        createdAt: CREATED_AT,
      },
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(repository.records.get(TEMPLATE_ID)).toBeInstanceOf(Template);
    expect(repository.revisions.get(REVISION_ID)).toBeInstanceOf(TemplateRevision);
    expect(repository.organizationIds).toEqual([ORGANIZATION_ID]);
    expect(organizations.requestedIds).toEqual([ORGANIZATION_ID]);
    expect(result).not.toBeInstanceOf(Template);
    expect(result.currentRevision).not.toBeInstanceOf(TemplateRevision);
  });

  it('uses the requested existing organization, not a default tenant', async () => {
    const { repository, useCase } = setup(
      new TemplateOrganizationLookupFake([OTHER_ORGANIZATION_ID]),
    );
    const result = await useCase.execute({ ...input(), organizationId: OTHER_ORGANIZATION_ID });
    expect(result.organizationId).toBe(OTHER_ORGANIZATION_ID);
    expect(result.currentRevision.organizationId).toBe(OTHER_ORGANIZATION_ID);
    expect(repository.organizationIds).toEqual([OTHER_ORGANIZATION_ID]);
  });

  it('rejects a missing organization even when another organization exists', async () => {
    const { repository, useCase } = setup(
      new TemplateOrganizationLookupFake([OTHER_ORGANIZATION_ID]),
    );
    await expect(useCase.execute(input())).rejects.toThrow(TemplateOrganizationNotFoundError);
    expect(repository.records.size).toBe(0);
    expect(repository.revisions.size).toBe(0);
  });

  it('validates organization identity before calling the lookup', async () => {
    const { repository, useCase, organizations } = setup();
    await expect(useCase.execute({ ...input(), organizationId: 'invalid' })).rejects.toThrow(
      InvalidEntityIdError,
    );
    expect(organizations.requestedIds).toEqual([]);
    expect(repository.records.size).toBe(0);
  });

  it.each([
    { changes: { name: ' ' }, error: InvalidTemplateNameError },
    { changes: { design: { format: 'A4' } }, error: InvalidFlyerDesignError },
  ])('does not store any part of an invalid template', async ({ changes, error }) => {
    const { repository, useCase } = setup();
    await expect(useCase.execute({ ...input(), ...changes })).rejects.toThrow(error);
    expect(repository.records.size).toBe(0);
    expect(repository.revisions.size).toBe(0);
  });

  it.each([
    ['invalid', REVISION_ID],
    [TEMPLATE_ID, 'invalid'],
  ])('rejects invalid identities from the generator', async (templateId, revisionId) => {
    const repository = new TemplateRepositoryFake();
    const useCase = new CreateTemplate(
      repository,
      new TemplateOrganizationLookupFake(),
      new TemplateIdGeneratorFake([templateId, revisionId]),
      creationClock,
      new PlanFake(),
    );
    await expect(useCase.execute(input())).rejects.toThrow(InvalidEntityIdError);
    expect(repository.records.size).toBe(0);
    expect(repository.revisions.size).toBe(0);
  });

  it('does not save an aggregate if its timestamp is invalid', async () => {
    const repository = new TemplateRepositoryFake();
    const useCase = new CreateTemplate(
      repository,
      new TemplateOrganizationLookupFake(),
      new TemplateIdGeneratorFake(),
      { now: () => new Date(NaN) },
      new PlanFake(),
    );
    await expect(useCase.execute(input())).rejects.toThrow(InvalidTimestampError);
    expect(repository.records.size).toBe(0);
  });

  it('does not expose mutable dimensions or revisions through the output DTO', async () => {
    const { repository, useCase } = setup();
    const request = input();
    const result = await useCase.execute(request);

    result.currentRevision.dimensions.width = -1;
    result.currentRevision.number = 90;
    result.currentRevision.id = 'replaced';

    const stored = repository.records.get(TEMPLATE_ID)!;
    expect(stored.currentRevision.dimensions.width).toBe(1080);
    expect(stored.currentRevision.id).toBe(REVISION_ID);
    expect(stored.currentRevision.number).toBe(1);
  });

  it('propagates organization lookup failures without storing anything', async () => {
    const organizations = new TemplateOrganizationLookupFake();
    const failure = new Error('Lookup unavailable');
    organizations.exists = () => Promise.reject(failure);
    const { repository, useCase } = setup(organizations);
    await expect(useCase.execute(input())).rejects.toBe(failure);
    expect(repository.records.size).toBe(0);
    expect(repository.revisions.size).toBe(0);
  });

  it('propagates an atomic storage failure instead of returning success', async () => {
    const { repository, useCase } = setup();
    const failure = new Error('Storage unavailable');
    repository.add = () => Promise.reject(failure);
    await expect(useCase.execute(input())).rejects.toBe(failure);
    expect(repository.records.size).toBe(0);
    expect(repository.revisions.size).toBe(0);
  });
});
