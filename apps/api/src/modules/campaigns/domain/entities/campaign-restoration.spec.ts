import { Campaign, type CampaignState } from './campaign.js';
import {
  CampaignStatus,
  CampaignFailureOrigin,
  GenerationFailureCode,
} from '../campaign-status.js';
import { PublicationStatus } from '#app/domain/publication-status';
import { GenerationSnapshot } from '../value-objects/generation-snapshot.js';
import { Promotion } from '../value-objects/promotion.js';
import { Money } from '#app/domain/value-objects/money';
import { campaignResult } from '../../application/campaign-result.js';
import { campaignState } from '../../../../../test/support/campaign-restoration.js';
import {
  domainFixture,
  resourcesFixture,
  testId,
  NOW,
  CONTENT,
} from '../../../../../test/support/campaign-fakes.js';
import {
  publicationCampaign,
  pendingPublications,
  summary,
} from '../../../../../test/support/publication-fixtures.js';

describe('Campaign restoration', () => {
  it.each(['draft', 'generating', 'pending', 'approved', 'failed'] as const)(
    'restores %s without new versions or timestamps',
    (name) => {
      const original = domainFixture()[name];
      expect(campaignResult(Campaign.restore(campaignState(original)))).toEqual(
        campaignResult(original),
      );
    },
  );

  it.each([
    PublicationStatus.PENDING,
    PublicationStatus.PUBLISHING,
    PublicationStatus.PUBLISHED,
    PublicationStatus.FAILED,
  ])('restores the campaign summary with destinations in %s', (status) => {
    const entries = summary(...pendingPublications());
    let campaign = publicationCampaign().startPublication(entries, new Date(NOW));
    if (status !== PublicationStatus.PENDING)
      campaign = campaign.recordPublicationSummary(
        entries.map((entry) => ({ ...entry, status, version: 2 })),
        new Date(NOW),
      );
    expect(campaignResult(Campaign.restore(campaignState(campaign)))).toEqual(
      campaignResult(campaign),
    );
  });

  it('restores partial outcomes and can continue the retry flow', () => {
    const entries = summary(...pendingPublications());
    const publishing = publicationCampaign().startPublication(entries, new Date(NOW));
    const outcomes = entries.map((entry, index) => ({
      ...entry,
      version: 2,
      status: index === 0 ? PublicationStatus.PUBLISHED : PublicationStatus.FAILED,
    }));
    const partial = Campaign.restore(
      campaignState(publishing.recordPublicationSummary(outcomes, new Date(NOW))),
    );
    expect(partial.status).toBe(CampaignStatus.PARTIALLY_PUBLISHED);
    expect(
      partial.retryPublication(
        outcomes.map((entry, index) =>
          index === 0 ? entry : { ...entry, version: 3, status: PublicationStatus.PUBLISHING },
        ),
        new Date(NOW),
      ).status,
    ).toBe(CampaignStatus.PUBLISHING);
  });

  it.each([
    { status: 'UNKNOWN' as CampaignStatus },
    { version: -1 },
    { version: 1.5 },
    { version: Number.MAX_SAFE_INTEGER + 1 },
    { generation: null },
    { candidateContent: null },
    { approvedContentId: testId(999) },
    { approvedSocialAccountIds: [testId(200), testId(200)] },
    { failureOrigin: CampaignFailureOrigin.GENERATION },
    { generationFailure: GenerationFailureCode.TIMEOUT },
    { updatedAt: NaN },
    { updatedAt: new Date(NOW).getTime() - 1 },
  ] satisfies Partial<CampaignState>[])('rejects an inconsistent approved state: %j', (change) => {
    expect(() =>
      Campaign.restore({ ...campaignState(domainFixture().approved), ...change }),
    ).toThrow();
  });

  it('rejects snapshots from another resource, generation dates and unsafe counters', () => {
    const state = campaignState(domainFixture().generating);
    const generation = state.generation!;
    const resources = resourcesFixture();
    resources.product.id = testId(999);
    const snapshot = GenerationSnapshot.capture(
      resources,
      state.instructions,
      state.cta,
      state.promotion,
    );
    for (const change of [
      { snapshot },
      { number: 0 },
      { number: Number.MAX_SAFE_INTEGER + 1 },
      { requestedAt: state.createdAt - 1 },
      { requestedAt: state.updatedAt + 1 },
    ]) {
      expect(() =>
        Campaign.restore({ ...state, generation: { ...generation, ...change } }),
      ).toThrow();
    }
  });

  it('keeps restored promotion values after expiration and without a live catalog price', () => {
    const { approved } = domainFixture();
    const restored = Campaign.restore(campaignState(approved));
    expect(restored.promotion!.price.amountMinor).toBe(1500);
    const price = Money.fromMinorUnits(1500, 'PEN');
    expect(Promotion.restore(price, null, new Date('2020-01-01T00:00:00.000Z')).price).toBe(price);
    expect(() => Promotion.restore(price, new Date(NOW), new Date(NOW))).toThrow();
  });

  it('copies restoration containers and keeps dates immutable', () => {
    const state = campaignState(
      domainFixture().pending.approve(CONTENT, new Date(NOW), [testId(200)]),
    );
    const accounts = [...state.approvedSocialAccountIds];
    const generation = { ...state.generation! };
    const restored = Campaign.restore({ ...state, generation, approvedSocialAccountIds: accounts });
    accounts.length = 0;
    generation.number = 30;
    restored.updatedAt.setFullYear(2000);
    expect(restored.approvedSocialAccountIds).toHaveLength(1);
    expect(restored.generation!.number).toBe(1);
    expect(restored.updatedAt.toISOString()).toBe(NOW);
  });

  it('rejects a state whose version cannot account for accepting and approving its generation', () => {
    const state = campaignState(domainFixture().approved);
    expect(() => Campaign.restore({ ...state, version: 1 })).toThrow();
    expect(() => Campaign.restore({ ...state, version: 2 })).toThrow();
  });
});
