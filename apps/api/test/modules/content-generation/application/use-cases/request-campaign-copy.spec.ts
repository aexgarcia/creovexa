import { PlanFake } from '../../../../support/plan-fakes.js';
import {
  campaignUseCases,
  campaignGenerationsFake,
  createInput,
  domainFixture,
  CAMPAIGN,
  OTHER_ORG,
} from '../../../../support/campaign-fakes.js';
import { CopyRepositoryFake, validCopy } from '../../../../support/generation-fakes.js';
import { JobQueueFake, immediateUnitOfWork } from '../../../../support/job-queue-fake.js';
import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
import {
  CopyGenerationError,
  type CopyGenerator,
} from '#app/modules/content-generation/application/ports/copy-generator';
import { GENERATE_COPY_JOB } from '#app/modules/content-generation/application/generation-job';
import { GenerationJobs } from '#app/modules/content-generation/application/generation-jobs';
import {
  GenerateCampaignCopy,
  GetCampaignCopy,
} from '#app/modules/content-generation/application/use-cases/generate-campaign-copy';
import type { GenerateCampaignImage } from '#app/modules/content-generation/application/use-cases/generate-campaign-image';
import { RequestCampaignCopy } from '#app/modules/content-generation/application/use-cases/request-campaign-copy';

async function fixture() {
  const f = campaignUseCases();
  await f.create.execute(createInput());
  const generations = campaignGenerationsFake(f.repository, f.lookups, f.ids, f.clock);
  const copies = new CopyRepositoryFake();
  const generate = vi.fn(async (input) => validCopy(input));
  const generator: CopyGenerator = { assertAvailable() {}, generate };
  const queue = new JobQueueFake();
  const plan = new PlanFake();
  const execute = new GenerateCampaignCopy(generations, copies, generator, f.ids, f.clock);
  const jobs = new GenerationJobs(
    execute,
    {} as GenerateCampaignImage,
    copies,
    { fail: vi.fn() } as never,
    f.clock,
  );
  await queue.process(GENERATE_COPY_JOB, (payload) => jobs.copy(payload));
  return {
    ...f,
    copies,
    generate,
    generator,
    queue,
    plan,
    request: new RequestCampaignCopy(
      generations,
      copies,
      generator,
      queue,
      immediateUnitOfWork,
      f.clock,
      plan,
    ),
    get: new GetCampaignCopy(generations, copies, f.clock),
  };
}

describe('RequestCampaignCopy', () => {
  it('accepts the request, starts the generation and leaves the provider to the worker', async () => {
    const f = await fixture();
    const accepted = await f.request.execute(f.selection);
    expect(accepted).toMatchObject({ status: 'PENDING', failureCode: null, copy: null });
    expect(f.generate).not.toHaveBeenCalled();
    const campaign = f.repository.records.get(CAMPAIGN)!;
    expect(campaign.status).toBe(CampaignStatus.GENERATING);
    expect(f.queue.accepted).toEqual([
      {
        name: GENERATE_COPY_JOB,
        key: accepted.generationId,
        payload: { ...f.selection, generationId: accepted.generationId },
      },
    ]);
    expect(await f.get.execute(f.selection)).toMatchObject({ status: 'PENDING' });
  });

  it('produces the copy when the worker runs the job and reports it as ready', async () => {
    const f = await fixture();
    const accepted = await f.request.execute(f.selection);
    await f.queue.drain();
    expect(f.generate).toHaveBeenCalledTimes(1);
    expect(await f.get.execute(f.selection)).toMatchObject({
      generationId: accepted.generationId,
      status: 'READY',
      copy: { headline: 'Producto' },
    });
  });

  it('does not queue a second job while one is waiting', async () => {
    const f = await fixture();
    const first = await f.request.execute(f.selection);
    const second = await f.request.execute(f.selection);
    expect(second.generationId).toBe(first.generationId);
    expect(f.queue.accepted).toHaveLength(1);
    expect(f.repository.saveCount).toBe(1);
  });

  it('consumes the copy quota once per new job (ADR-0033)', async () => {
    const f = await fixture();
    await f.request.execute(f.selection);
    await f.request.execute(f.selection);
    expect(f.plan.consumed).toEqual([
      expect.objectContaining({ organizationId: f.selection.organizationId, kind: 'COPY' }),
    ]);
    expect(f.plan.consumed[0]!.options?.transaction).toBeDefined();
  });

  it('rejects the request without queuing when the quota is exhausted', async () => {
    const f = await fixture();
    f.plan.exhausted = true;
    await expect(f.request.execute(f.selection)).rejects.toMatchObject({
      name: 'AiQuotaExceededError',
    });
    expect(f.queue.accepted).toHaveLength(0);
  });

  it('returns finished copy without queuing anything', async () => {
    const f = await fixture();
    await f.request.execute(f.selection);
    await f.queue.drain();
    const again = await f.request.execute(f.selection);
    expect(again).toMatchObject({ status: 'READY', copy: { headline: 'Producto' } });
    expect(f.queue.accepted).toHaveLength(1);
  });

  it('records the reason when the job fails, so the CMS can show it and retry', async () => {
    const f = await fixture();
    f.generate.mockRejectedValueOnce(new CopyGenerationError('TIMEOUT'));
    await f.request.execute(f.selection);
    await f.queue.drain();
    expect(await f.get.execute(f.selection)).toMatchObject({
      status: 'FAILED',
      failureCode: 'TIMEOUT',
      copy: null,
    });
    await f.request.execute(f.selection);
    await f.queue.drain();
    expect(await f.get.execute(f.selection)).toMatchObject({ status: 'READY' });
  });

  it('fails at once, without changing the draft, when no provider is configured', async () => {
    const f = await fixture();
    f.generator.assertAvailable = () => {
      throw new CopyGenerationError('UNAVAILABLE');
    };
    await expect(f.request.execute(f.selection)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(f.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.DRAFT);
    expect(f.queue.accepted).toHaveLength(0);
  });

  it('rejects foreign organizations and approved campaigns without queuing', async () => {
    const f = await fixture();
    await expect(
      f.request.execute({ ...f.selection, organizationId: OTHER_ORG }),
    ).rejects.toThrow();
    f.repository.records.set(CAMPAIGN, domainFixture().approved);
    await expect(f.request.execute(f.selection)).rejects.toThrow();
    expect(f.queue.accepted).toHaveLength(0);
  });

  it('reports nothing before the first request', async () => {
    const f = await fixture();
    expect(await f.get.execute(f.selection)).toBeNull();
  });
});
