import { vi } from 'vitest';
import { ListCampaignPublications } from '#app/modules/publications/application/use-cases/list-campaign-publications';
import { CampaignNotFoundError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { InvalidPaginationError } from '#app/domain/pagination';
import { PublicationQueryFake } from '../../../../support/publication-query-fakes.js';
import {
  pendingPublications,
  ATTEMPT_ONE,
  ATTEMPT_TWO,
} from '../../../../support/publication-fixtures.js';
import { ORG, OTHER_ORG, CAMPAIGN, NOW } from '../../../../support/campaign-fakes.js';
import { PublicationFailureCode } from '#app/modules/publications/domain/entities/publication';

describe('ListCampaignPublications', () => {
  it('keeps independent outcomes, maps dates and detaches the attempt result', async () => {
    const repository = new PublicationQueryFake();
    const [first, second] = pendingPublications();
    const published = first
      .startAttempt(ATTEMPT_ONE, new Date(NOW))
      .recordSuccess(ATTEMPT_ONE, 'remote-1', new Date(NOW));
    const failed = second
      .startAttempt(ATTEMPT_TWO, new Date(NOW))
      .recordFailure(ATTEMPT_TWO, PublicationFailureCode.REJECTED, new Date(NOW));
    await repository.add(ORG, published);
    await repository.add(ORG, failed);
    const useCase = new ListCampaignPublications(repository, { exists: async () => true });
    const result = await useCase.execute({ organizationId: ORG, campaignId: CAMPAIGN });
    expect(result).toMatchObject({
      total: 2,
      page: 1,
      limit: 20,
      items: [
        { status: 'PUBLISHED', externalPostId: 'remote-1', publishedAt: NOW },
        { status: 'FAILED', failureCode: 'REJECTED', publishedAt: null },
      ],
    });
    result.items[0]!.attempt!.number = 100;
    expect(published.attempt!.number).toBe(1);
    expect(
      await useCase.execute({ organizationId: ORG, campaignId: CAMPAIGN, page: 2, limit: 2 }),
    ).toMatchObject({ total: 2, items: [] });
  });
  it('rejects missing or foreign campaigns before reading publications', async () => {
    const repository = new PublicationQueryFake();
    const read = vi.spyOn(repository, 'pageByCampaign');
    const exists = vi.fn().mockResolvedValue(false);
    await expect(
      new ListCampaignPublications(repository, { exists }).execute({
        organizationId: OTHER_ORG,
        campaignId: CAMPAIGN,
      }),
    ).rejects.toThrow(CampaignNotFoundError);
    expect(exists).toHaveBeenCalledWith(OTHER_ORG, CAMPAIGN);
    expect(read).not.toHaveBeenCalled();
  });
  it('returns an empty page for an existing campaign and validates pagination first', async () => {
    const exists = vi.fn().mockResolvedValue(true);
    const useCase = new ListCampaignPublications(new PublicationQueryFake(), { exists });
    await expect(
      useCase.execute({ organizationId: ORG, campaignId: CAMPAIGN, limit: 0 }),
    ).rejects.toThrow(InvalidPaginationError);
    expect(exists).not.toHaveBeenCalled();
    expect(await useCase.execute({ organizationId: ORG, campaignId: CAMPAIGN })).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });
});
