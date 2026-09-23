import { GetTemplate } from './get-template.js';
import { ListTemplates } from './list-templates.js';
import { TemplateNotFoundError } from '../../domain/errors/template.errors.js';
import {
  TemplateRepositoryFake,
  templateFixture,
  OTHER_ORGANIZATION_ID,
} from '../../../../../test/support/template-fakes.js';

describe('Read templates', () => {
  it('returns the stored current revision and hides templates from other organizations', async () => {
    const template = templateFixture();
    const repository = new TemplateRepositoryFake();
    await repository.add(template.organizationId, template);
    const get = new GetTemplate(repository);
    expect(
      await get.execute({ organizationId: template.organizationId, templateId: template.id }),
    ).toMatchObject({
      id: template.id,
      currentRevision: { id: template.currentRevision.id, number: 1 },
    });
    await expect(
      get.execute({ organizationId: OTHER_ORGANIZATION_ID, templateId: template.id }),
    ).rejects.toThrow(TemplateNotFoundError);
    expect(
      await new ListTemplates(repository).execute({ organizationId: OTHER_ORGANIZATION_ID }),
    ).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });
  it('returns page metadata when the requested page is empty', async () => {
    const template = templateFixture();
    const repository = new TemplateRepositoryFake();
    await repository.add(template.organizationId, template);
    expect(
      await new ListTemplates(repository).execute({
        organizationId: template.organizationId,
        page: 2,
        limit: 1,
      }),
    ).toEqual({ items: [], total: 1, page: 2, limit: 1 });
  });
});
