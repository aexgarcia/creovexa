import {
  campaignUseCases,
  campaignGenerationsFake,
  createInput,
  payloadFixture,
  CAMPAIGN,
  CONTENT,
  GENERATION,
} from '../../../../support/campaign-fakes.js';
import { CopyRepositoryFake, validCopy } from '../../../../support/generation-fakes.js';
import { JobQueueFake, immediateUnitOfWork } from '../../../../support/job-queue-fake.js';
import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
import { InvalidCampaignTransitionError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import {
  CopyGenerationError,
  type CopyGenerator,
} from '#app/modules/content-generation/application/ports/copy-generator';
import { GENERATE_COPY_JOB } from '#app/modules/content-generation/application/generation-job';
import { RegenerateCampaign } from '#app/modules/content-generation/application/use-cases/regenerate-campaign';

// Una campaña con flyer pendiente de aprobación y el copy de su versión 1, corregido por el usuario.
async function fixture() {
  const f = campaignUseCases();
  await f.create.execute(createInput());
  await f.generate.execute(f.selection);
  await f.record.execute({ ...f.selection, generationId: GENERATION, content: payloadFixture() });
  const copies = new CopyRepositoryFake();
  copies.saved = { ...validCopy(), headline: 'Titular corregido', subheadline: 'Hecho para ti' };
  const generator: CopyGenerator = {
    assertAvailable: vi.fn(),
    generate: vi.fn(),
  };
  const queue = new JobQueueFake();
  const enqueued: string[] = [];
  vi.spyOn(queue, 'enqueue').mockImplementation(async (job) => {
    enqueued.push(job.name);
  });
  return {
    ...f,
    copies,
    generator,
    enqueued,
    useCase: new RegenerateCampaign(
      campaignGenerationsFake(f.repository, f.lookups, f.ids, f.clock),
      copies,
      generator,
      queue,
      immediateUnitOfWork,
      f.clock,
    ),
  };
}

describe('RegenerateCampaign', () => {
  it('starts a new version and reuses the corrected texts when they still hold', async () => {
    const f = await fixture();
    const result = await f.useCase.execute(f.selection);
    const campaign = f.repository.records.get(CAMPAIGN)!;
    expect(campaign.status).toBe(CampaignStatus.GENERATING);
    expect(campaign.generation!.number).toBe(2);
    expect(result).toMatchObject({
      generationId: campaign.generation!.id,
      status: 'READY',
      copy: { headline: 'Titular corregido', subheadline: 'Hecho para ti' },
    });
    expect(f.enqueued).toEqual([]);
    expect(f.generator.generate).not.toHaveBeenCalled();
    // La versión anterior queda en el historial.
    expect(f.repository.contents.get(CONTENT)).toBeDefined();
  });

  it('asks for new copy when the old one no longer matches the current data', async () => {
    const f = await fixture();
    // El precio cambió: el caption anterior ya no dice el precio correcto.
    f.lookups.data.product.regularPrice.amountMinor = 2500;
    const result = await f.useCase.execute(f.selection);
    expect(result).toMatchObject({ status: 'PENDING', copy: null });
    expect(f.enqueued).toEqual([GENERATE_COPY_JOB]);
  });

  it('checks the copy provider only when there is nothing to reuse', async () => {
    const f = await fixture();
    f.copies.saved = null;
    vi.mocked(f.generator.assertAvailable).mockImplementation(() => {
      throw new CopyGenerationError('UNAVAILABLE');
    });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(f.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.PENDING_APPROVAL);
  });

  it('does not regenerate a draft', async () => {
    const f = campaignUseCases();
    await f.create.execute(createInput());
    const copies = new CopyRepositoryFake();
    const useCase = new RegenerateCampaign(
      campaignGenerationsFake(f.repository, f.lookups, f.ids, f.clock),
      copies,
      { assertAvailable() {}, generate: vi.fn() },
      new JobQueueFake(),
      immediateUnitOfWork,
      f.clock,
    );
    await expect(useCase.execute(f.selection)).rejects.toBeInstanceOf(
      InvalidCampaignTransitionError,
    );
  });
});
