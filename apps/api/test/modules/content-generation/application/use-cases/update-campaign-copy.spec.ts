import {
  campaignUseCases,
  campaignGenerationsFake,
  createInput,
  domainFixture,
  CAMPAIGN,
  OTHER_ORG,
} from '../../../../support/campaign-fakes.js';
import { CopyRepositoryFake, validCopy } from '../../../../support/generation-fakes.js';
import {
  InvalidFlyerTextError,
  type CopyGenerator,
} from '#app/modules/content-generation/application/ports/copy-generator';
import { GenerateCampaignCopy } from '#app/modules/content-generation/application/use-cases/generate-campaign-copy';
import { UpdateCampaignCopy } from '#app/modules/content-generation/application/use-cases/update-campaign-copy';
import {
  InvalidCampaignTransitionError,
  StaleGenerationResultError,
} from '#app/modules/campaigns/contract';

async function fixture() {
  const f = campaignUseCases();
  await f.create.execute(createInput());
  const generations = campaignGenerationsFake(f.repository, f.lookups, f.ids, f.clock);
  const copies = new CopyRepositoryFake();
  const generator: CopyGenerator = {
    assertAvailable() {},
    generate: async (input) => validCopy(input),
  };
  const { generationId } = await new GenerateCampaignCopy(
    generations,
    copies,
    generator,
    f.ids,
    f.clock,
  ).execute(f.selection);
  return {
    ...f,
    copies,
    generationId,
    useCase: new UpdateCampaignCopy(generations, copies, f.clock),
  };
}

describe('UpdateCampaignCopy', () => {
  it('replaces headline and subheadline and keeps the post texts', async () => {
    const f = await fixture();
    const before = f.copies.saved!;
    const result = await f.useCase.execute({
      ...f.selection,
      generationId: f.generationId,
      headline: '  Tu café   favorito ',
      subheadline: 'Tres variedades de altura',
    });
    expect(result).toMatchObject({ generationId: f.generationId, status: 'READY' });
    expect(f.copies.saved).toEqual({
      ...before,
      headline: 'Tu café favorito',
      subheadline: 'Tres variedades de altura',
    });
  });
  it('rejects texts that break the flyer rules', async () => {
    const f = await fixture();
    await expect(
      f.useCase.execute({
        ...f.selection,
        generationId: f.generationId,
        headline: 'Envío gratis',
        subheadline: null,
      }),
    ).rejects.toBeInstanceOf(InvalidFlyerTextError);
    await expect(
      f.useCase.execute({
        ...f.selection,
        generationId: f.generationId,
        headline: 'Tu café favorito',
        subheadline: 'Ahora a S/ 15.00',
      }),
    ).rejects.toMatchObject({ field: 'subheadline' });
  });
  it('refuses once the image was requested', async () => {
    const f = await fixture();
    f.copies.editResult = 'IMAGE_STARTED';
    await expect(
      f.useCase.execute({
        ...f.selection,
        generationId: f.generationId,
        headline: 'Tu café favorito',
        subheadline: null,
      }),
    ).rejects.toBeInstanceOf(InvalidCampaignTransitionError);
  });
  it('refuses a campaign that already has a flyer to approve', async () => {
    const f = await fixture();
    f.repository.records.set(CAMPAIGN, domainFixture().pending);
    await expect(
      f.useCase.execute({
        ...f.selection,
        generationId: f.generationId,
        headline: 'Tu café favorito',
        subheadline: null,
      }),
    ).rejects.toThrow();
  });
  it('rejects a generation that is not the current one', async () => {
    const f = await fixture();
    await expect(
      f.useCase.execute({
        ...f.selection,
        generationId: '00000000-0000-4000-8000-000000000999',
        headline: 'Tu café favorito',
        subheadline: null,
      }),
    ).rejects.toBeInstanceOf(StaleGenerationResultError);
  });
  it('does not edit another organization', async () => {
    const f = await fixture();
    await expect(
      f.useCase.execute({
        ...f.selection,
        organizationId: OTHER_ORG,
        generationId: f.generationId,
        headline: 'Tu café favorito',
        subheadline: null,
      }),
    ).rejects.toThrow();
    expect(f.copies.saved!.headline).toBe('Producto');
  });
});
