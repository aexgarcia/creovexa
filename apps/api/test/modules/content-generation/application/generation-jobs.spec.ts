import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import { StaleGenerationResultError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { GenerationJobs } from '#app/modules/content-generation/application/generation-jobs';
import type { CampaignCopyRepository } from '#app/modules/content-generation/application/ports/campaign-copy-repository';
import type { CampaignImageRepository } from '#app/modules/content-generation/application/ports/campaign-image-repository';
import { CopyGenerationError } from '#app/modules/content-generation/application/ports/copy-generator';
import type { GenerateCampaignCopy } from '#app/modules/content-generation/application/use-cases/generate-campaign-copy';
import type { GenerateCampaignImage } from '#app/modules/content-generation/application/use-cases/generate-campaign-image';
import { CampaignClockFake, CAMPAIGN, GENERATION, ORG } from '../../../support/campaign-fakes.js';

const payload = { organizationId: ORG, campaignId: CAMPAIGN, generationId: GENERATION };

function fixture() {
  const copy = { execute: vi.fn() };
  const image = { execute: vi.fn() };
  const copies = { fail: vi.fn() };
  const images = { fail: vi.fn() };
  const jobs = new GenerationJobs(
    copy as unknown as GenerateCampaignCopy,
    image as unknown as GenerateCampaignImage,
    copies as unknown as CampaignCopyRepository,
    images as unknown as CampaignImageRepository,
    new CampaignClockFake(),
  );
  return { copy, image, copies, images, jobs };
}

describe('GenerationJobs', () => {
  it('runs the exact generation it was queued for', async () => {
    const f = fixture();
    await f.jobs.copy(payload);
    await f.jobs.image(payload);
    expect(f.copy.execute).toHaveBeenCalledWith(payload);
    expect(f.image.execute).toHaveBeenCalledWith(payload);
  });

  it('records the failure code and fails the job', async () => {
    const f = fixture();
    f.copy.execute.mockRejectedValueOnce(new CopyGenerationError('INVALID_OUTPUT'));
    f.image.execute.mockRejectedValueOnce(new CampaignImageError('RATE_LIMITED'));
    await expect(f.jobs.copy(payload)).rejects.toBeInstanceOf(CopyGenerationError);
    await expect(f.jobs.image(payload)).rejects.toBeInstanceOf(CampaignImageError);
    expect(f.copies.fail).toHaveBeenCalledWith(payload, 'INVALID_OUTPUT', expect.any(Date));
    expect(f.images.fail).toHaveBeenCalledWith(payload, 'RATE_LIMITED', expect.any(Date));
  });

  it('records unexpected errors without exposing their message', async () => {
    const f = fixture();
    f.copy.execute.mockRejectedValueOnce(new Error('secret detail'));
    await expect(f.jobs.copy(payload)).rejects.toThrow();
    expect(f.copies.fail).toHaveBeenCalledWith(payload, 'FAILED', expect.any(Date));
  });

  it.each([
    ['copy busy', 'copy', new CopyGenerationError('BUSY')],
    ['image busy', 'image', new CampaignImageError('BUSY')],
    ['image stale', 'image', new CampaignImageError('STALE_RESULT')],
    ['generation replaced', 'copy', new StaleGenerationResultError()],
  ] as const)('treats %s as nothing to do', async (_label, kind, error) => {
    const f = fixture();
    f[kind].execute.mockRejectedValueOnce(error);
    await expect(f.jobs[kind](payload)).resolves.toBeUndefined();
    expect(f.copies.fail).not.toHaveBeenCalled();
    expect(f.images.fail).not.toHaveBeenCalled();
  });

  it('rejects a payload that is not a generation reference', async () => {
    const f = fixture();
    await expect(f.jobs.copy({ ...payload, campaignId: 'not-a-uuid' })).rejects.toThrow();
    expect(f.copy.execute).not.toHaveBeenCalled();
  });
});
