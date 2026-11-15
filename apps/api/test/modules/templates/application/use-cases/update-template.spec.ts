import { UpdateTemplate } from '#app/modules/templates/application/use-cases/update-template';
import { FlyerDesign, InvalidFlyerDesignError } from '#app/domain/value-objects/flyer-design';
import {
  TemplateNotFoundError,
  TemplateRevisionConflictError,
  InvalidTemplateNameError,
} from '#app/modules/templates/domain/errors/template.errors';
import {
  TemplateRepositoryFake,
  templateFixture,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  TEMPLATE_ID,
  REVISION_ID,
  NEXT_REVISION_ID,
  UPDATED_AT,
} from '../../../../support/template-fakes.js';
describe('UpdateTemplate', () => {
  async function fixture() {
    const repo = new TemplateRepositoryFake();
    await repo.add(ORGANIZATION_ID, templateFixture());
    return {
      repo,
      useCase: new UpdateTemplate(
        repo,
        { next: () => NEXT_REVISION_ID },
        { now: () => new Date(UPDATED_AT) },
      ),
    };
  }
  const input = {
    organizationId: ORGANIZATION_ID,
    templateId: TEMPLATE_ID,
    expectedRevisionId: REVISION_ID,
    name: 'Edited',
  };
  it('retains the historical revision and creates a new one', async () => {
    const { repo, useCase } = await fixture();
    const result = await useCase.execute(input);
    expect(result).toMatchObject({
      name: 'Edited',
      currentRevision: { id: NEXT_REVISION_ID, number: 2 },
    });
    expect(repo.revisions.has(REVISION_ID)).toBe(true);
    expect(repo.revisions.size).toBe(2);
    await expect(useCase.execute(input)).rejects.toThrow(TemplateRevisionConflictError);
  });
  it('rejects another organization and empty names without saving', async () => {
    const { repo, useCase } = await fixture();
    await expect(
      useCase.execute({ ...input, organizationId: OTHER_ORGANIZATION_ID }),
    ).rejects.toThrow(TemplateNotFoundError);
    await expect(useCase.execute({ ...input, name: ' ' })).rejects.toThrow(
      InvalidTemplateNameError,
    );
    expect(repo.revisions.size).toBe(1);
  });
  it('revises visual configuration while retaining the previous immutable design', async () => {
    const { repo, useCase } = await fixture();
    const original = await repo.findById(ORGANIZATION_ID, TEMPLATE_ID);
    const design = {
      ...FlyerDesign.create().data,
      composition: 'PRODUCT_PANEL',
      mode: 'LIGHT',
      elements: { ...FlyerDesign.create().data.elements, regularPrice: false },
    };
    const result = await useCase.execute({ ...input, design });
    expect(result.currentRevision.design).toEqual(design);
    expect(original!.currentRevision.design).toEqual(FlyerDesign.create().data);
    expect(repo.revisions.has(REVISION_ID)).toBe(true);
  });
  it('does not persist invalid visual configuration', async () => {
    const { repo, useCase } = await fixture();
    await expect(useCase.execute({ ...input, design: { layout: 'HTML' } })).rejects.toThrow(
      InvalidFlyerDesignError,
    );
    expect(repo.revisions.size).toBe(1);
  });
});
