import { UpdateTemplate } from './update-template.js';
import {
  TemplateNotFoundError,
  TemplateRevisionConflictError,
  InvalidTemplateNameError,
} from '../../domain/errors/template.errors.js';
import {
  TemplateRepositoryFake,
  templateFixture,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  TEMPLATE_ID,
  REVISION_ID,
  NEXT_REVISION_ID,
  UPDATED_AT,
} from '../../../../../test/support/template-fakes.js';
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
});
