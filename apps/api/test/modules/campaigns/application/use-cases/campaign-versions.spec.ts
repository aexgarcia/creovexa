import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
import {
  ConcurrentCampaignModificationError,
  InvalidCampaignTransitionError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import { CampaignResourceNotFoundError } from '#app/modules/campaigns/application/errors/campaign-resource-not-found.error';
import {
  ListCampaignVersions,
  RestoreCampaignVersion,
} from '#app/modules/campaigns/application/use-cases/campaign-versions';
import { GetCampaignFinalAsset } from '#app/modules/campaigns/application/use-cases/get-campaign-final-asset';
import {
  campaignUseCases,
  createInput,
  payloadFixture,
  ASSET,
  CONTENT,
  GENERATION,
  OTHER_ORG,
  testId,
} from '../../../../support/campaign-fakes.js';
import { finalAssetsFake } from '../../../../support/final-assets-fake.js';

// Una campaña aprobada en su versión 1 que se está regenerando (versión 2).
async function setup() {
  const context = campaignUseCases();
  await context.create.execute(createInput());
  await context.generate.execute(context.selection);
  await context.record.execute({
    ...context.selection,
    generationId: GENERATION,
    content: payloadFixture(),
  });
  await context.approve.execute({ ...context.selection, contentId: CONTENT });
  const regenerating = await context.regenerate.execute(context.selection);
  return {
    ...context,
    regenerating,
    list: new ListCampaignVersions(context.repository),
    restore: new RestoreCampaignVersion(context.repository, context.clock),
  };
}

describe('ListCampaignVersions', () => {
  it('lists every version, newest first, with its content and frozen prices', async () => {
    const f = await setup();
    const versions = await f.list.execute(f.selection);
    expect(versions.map((version) => [version.number, version.current])).toEqual([
      [2, true],
      [1, false],
    ]);
    expect(versions[0]!.content).toBeNull();
    expect(versions[1]!.content).toMatchObject({ id: CONTENT, headline: 'Promoción' });
    expect(versions[1]!.prices).toEqual({
      regular: { amountMinor: 2000, currency: 'PEN' },
      promotion: { amountMinor: 1500, currency: 'PEN' },
    });
  });
  it('hides the history of another organization', async () => {
    const f = await setup();
    await expect(f.list.execute({ ...f.selection, organizationId: OTHER_ORG })).rejects.toThrow();
  });
});

describe('RestoreCampaignVersion', () => {
  it('brings back an earlier version pending approval', async () => {
    const f = await setup();
    const result = await f.restore.execute({
      ...f.selection,
      generationId: GENERATION,
      expectedVersion: f.regenerating.version,
    });
    expect(result).toMatchObject({
      status: CampaignStatus.PENDING_APPROVAL,
      approvedContentId: null,
      candidateContent: { id: CONTENT },
      generation: { id: GENERATION, number: 1 },
    });
    // La versión recuperada se puede aprobar de nuevo.
    await expect(f.approve.execute({ ...f.selection, contentId: CONTENT })).resolves.toMatchObject({
      status: CampaignStatus.APPROVED,
    });
  });
  it('rejects a stale view, an unknown version and a version without flyer', async () => {
    const f = await setup();
    await expect(
      f.restore.execute({
        ...f.selection,
        generationId: GENERATION,
        expectedVersion: f.regenerating.version - 1,
      }),
    ).rejects.toBeInstanceOf(ConcurrentCampaignModificationError);
    await expect(
      f.restore.execute({
        ...f.selection,
        generationId: testId(990),
        expectedVersion: f.regenerating.version,
      }),
    ).rejects.toBeInstanceOf(CampaignResourceNotFoundError);
    await expect(
      f.restore.execute({
        ...f.selection,
        generationId: f.regenerating.generation!.id,
        expectedVersion: f.regenerating.version,
      }),
    ).rejects.toBeInstanceOf(InvalidCampaignTransitionError);
  });
});

describe('GetCampaignFinalAsset for earlier versions', () => {
  it('serves the flyer of an earlier version of the same campaign', async () => {
    const f = await setup();
    const read = vi.spyOn(finalAssetsFake, 'readFinal');
    await new GetCampaignFinalAsset(f.repository, finalAssetsFake).execute({
      ...f.selection,
      assetId: ASSET,
    });
    expect(read).toHaveBeenCalledWith(expect.objectContaining({ generationId: GENERATION }));
    read.mockRestore();
  });
});
