import { vi } from 'vitest';
import { GetCampaign } from './get-campaign.js';
import { ListCampaigns } from './list-campaigns.js';
import { CampaignNotFoundError } from '../../domain/errors/campaign.errors.js';
import { InvalidPaginationError } from '#app/domain/pagination';
import {
  CampaignRepositoryFake,
  domainFixture,
  ORG,
  OTHER_ORG,
  CAMPAIGN,
  testId,
} from '../../../../../test/support/campaign-fakes.js';

describe('Campaign queries', () => {
  it('returns application data without changing the stored campaign', async () => {
    const repository = new CampaignRepositoryFake();
    const { approved } = domainFixture();
    repository.records.set(CAMPAIGN, approved);
    const result = await new GetCampaign(repository).execute({
      organizationId: ORG,
      campaignId: CAMPAIGN,
    });
    expect(result).toMatchObject({ id: CAMPAIGN, status: 'APPROVED', version: approved.version });
    result.approvedSocialAccountIds.push(testId(700));
    expect(approved.approvedSocialAccountIds).toEqual([]);
    expect(repository.saveCount).toBe(0);
  });

  it('does not disclose missing, foreign or mismatched campaigns', async () => {
    const repository = new CampaignRepositoryFake();
    const query = new GetCampaign(repository);
    await expect(query.execute({ organizationId: ORG, campaignId: CAMPAIGN })).rejects.toThrow(
      CampaignNotFoundError,
    );
    repository.records.set(CAMPAIGN, domainFixture().draft);
    await expect(
      query.execute({ organizationId: OTHER_ORG, campaignId: CAMPAIGN }),
    ).rejects.toThrow(CampaignNotFoundError);
    vi.spyOn(repository, 'findById').mockResolvedValue(domainFixture().draft);
    await expect(query.execute({ organizationId: ORG, campaignId: testId(999) })).rejects.toThrow(
      CampaignNotFoundError,
    );
  });

  it('uses scoped pagination, retains totals on empty pages and rejects invalid windows', async () => {
    const repository = new CampaignRepositoryFake();
    repository.records.set(CAMPAIGN, domainFixture().draft);
    const query = new ListCampaigns(repository);
    expect(await query.execute({ organizationId: ORG })).toMatchObject({
      page: 1,
      limit: 20,
      total: 1,
      items: [{ id: CAMPAIGN }],
    });
    expect(await query.execute({ organizationId: ORG, page: 2, limit: 1 })).toEqual({
      page: 2,
      limit: 1,
      total: 1,
      items: [],
    });
    expect(await query.execute({ organizationId: OTHER_ORG })).toMatchObject({
      total: 0,
      items: [],
    });
    await expect(query.execute({ organizationId: ORG, limit: 101 })).rejects.toThrow(
      InvalidPaginationError,
    );
  });
});
