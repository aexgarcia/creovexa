import { UpdateTemplateArchive } from '#app/modules/templates/application/use-cases/update-template-archive';
import { ListTemplates } from '#app/modules/templates/application/use-cases/list-templates';
import { TemplateNotFoundError } from '#app/modules/templates/domain/errors/template.errors';
import {
  TemplateRepositoryFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  templateFixture,
} from '../../../../support/template-fakes.js';

describe('Archivado de plantillas', () => {
  const later = new Date('2026-11-15T12:00:00Z');
  it('archiva, filtra y restaura sin cambiar el contenido ni sus fechas', async () => {
    const repository = new TemplateRepositoryFake();
    const original = templateFixture();
    await repository.add(ORGANIZATION_ID, original);
    const useCase = new UpdateTemplateArchive(repository, { now: () => later });
    const input = { organizationId: ORGANIZATION_ID, id: original.id, archived: true };
    const archived = await useCase.execute(input);
    expect(archived.archivedAt).toBe(later.toISOString());
    expect(archived.updatedAt).toBe(original.updatedAt.toISOString());
    expect(archived.currentRevision.id).toBe(original.currentRevision.id);
    const list = new ListTemplates(repository);
    expect((await list.execute({ organizationId: ORGANIZATION_ID })).total).toBe(0);
    expect(
      (await list.execute({ organizationId: ORGANIZATION_ID, status: 'archived' })).total,
    ).toBe(1);
    expect((await list.execute({ organizationId: ORGANIZATION_ID, status: 'all' })).total).toBe(1);
    const repeated = await new UpdateTemplateArchive(repository, {
      now: () => new Date(later.getTime() + 1000),
    }).execute(input);
    expect(repeated.archivedAt).toBe(archived.archivedAt);
    expect((await useCase.execute({ ...input, archived: false })).archivedAt).toBeNull();
    expect((await list.execute({ organizationId: ORGANIZATION_ID })).total).toBe(1);
  });
  it('rechaza recursos de otra organización y recursos inexistentes', async () => {
    const repository = new TemplateRepositoryFake();
    const original = templateFixture();
    await repository.add(ORGANIZATION_ID, original);
    const useCase = new UpdateTemplateArchive(repository, { now: () => later });
    await expect(
      useCase.execute({ organizationId: OTHER_ORGANIZATION_ID, id: original.id, archived: true }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
    expect((await repository.findById(ORGANIZATION_ID, original.id))?.archivedAt).toBeNull();
    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: OTHER_ORGANIZATION_ID,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);
  });
});
