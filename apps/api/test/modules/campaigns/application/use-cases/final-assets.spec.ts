import { GetCampaignFinalAsset } from '#app/modules/campaigns/application/use-cases/get-campaign-final-asset';
import { ApproveCampaign } from '#app/modules/campaigns/application/use-cases/approve-campaign';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import type { CampaignFinalAssets } from '#app/modules/campaigns/application/ports/campaign-final-assets';
import {
  domainFixture,
  CampaignRepositoryFake,
  CampaignClockFake,
  ORG,
  OTHER_ORG,
  CAMPAIGN,
  CONTENT,
  ASSET,
  EXPIRES,
  testId,
} from '../../../../support/campaign-fakes.js';
import { finalAssetsFake } from '../../../../support/final-assets-fake.js';
function fixture() {
  const repository = new CampaignRepositoryFake();
  repository.records.set(CAMPAIGN, domainFixture().pending);
  const assets = { readFinal: vi.fn<CampaignFinalAssets['readFinal']>(finalAssetsFake.readFinal) };
  const clock = new CampaignClockFake();
  return {
    repository,
    assets,
    clock,
    get: new GetCampaignFinalAsset(repository, assets),
    approve: new ApproveCampaign(repository, clock, assets),
  };
}
describe('Final flyer reading and approval', () => {
  it('pins the content owner, campaign and generation when reading the final asset', async () => {
    const f = fixture();
    const result = await f.get.execute({
      organizationId: ORG,
      campaignId: CAMPAIGN,
      assetId: ASSET,
    });
    expect(result.asset.purpose).toBe('FINAL_PIECE');
    expect(f.assets.readFinal).toHaveBeenCalledWith({
      organizationId: ORG,
      campaignId: CAMPAIGN,
      generationId: domainFixture().content.generationId,
      assetId: ASSET,
    });
  });
  it('rejects a foreign campaign or unreferenced asset before external reads', async () => {
    const f = fixture();
    await expect(
      f.get.execute({ organizationId: OTHER_ORG, campaignId: CAMPAIGN, assetId: ASSET }),
    ).rejects.toThrow();
    await expect(
      f.get.execute({ organizationId: ORG, campaignId: CAMPAIGN, assetId: testId(600) }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(f.assets.readFinal).not.toHaveBeenCalled();
  });
  it('reports missing final bytes without allowing approval', async () => {
    const f = fixture();
    f.assets.readFinal.mockResolvedValue(null);
    await expect(
      f.get.execute({ organizationId: ORG, campaignId: CAMPAIGN, assetId: ASSET }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      f.approve.execute({ organizationId: ORG, campaignId: CAMPAIGN, contentId: CONTENT }),
    ).rejects.toMatchObject({ code: 'FINAL_ASSET_REQUIRED' });
    expect(f.repository.records.get(CAMPAIGN)?.approvedContentId).toBeNull();
  });
  it('does not approve when the reader detects changed or invalid bytes', async () => {
    const f = fixture();
    f.assets.readFinal.mockRejectedValue(new CampaignImageError('INVALID_OUTPUT'));
    await expect(
      f.approve.execute({ organizationId: ORG, campaignId: CAMPAIGN, contentId: CONTENT }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.repository.records.get(CAMPAIGN)?.status).toBe('PENDING_APPROVAL');
  });
  it('does not read assets for a stale content ID', async () => {
    const f = fixture();
    await expect(
      f.approve.execute({ organizationId: ORG, campaignId: CAMPAIGN, contentId: testId(600) }),
    ).rejects.toThrow();
    expect(f.assets.readFinal).not.toHaveBeenCalled();
  });
  it('checks expiry again after reading the final bytes', async () => {
    const f = fixture();
    f.assets.readFinal.mockImplementation(async (input) => {
      f.clock.value = EXPIRES;
      return finalAssetsFake.readFinal(input);
    });
    await expect(
      f.approve.execute({ organizationId: ORG, campaignId: CAMPAIGN, contentId: CONTENT }),
    ).rejects.toThrow();
    expect(f.repository.records.get(CAMPAIGN)?.approvedContentId).toBeNull();
  });
});
