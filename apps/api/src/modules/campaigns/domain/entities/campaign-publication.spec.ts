import { PublicationStatus } from '#app/domain/publication-status';
import { InvalidTimestampError } from '#app/domain/timestamp';
import { PublicationFailureCode } from '#app/modules/publications/domain/entities/publication';
import { campaignResult } from '../../application/campaign-result.js';
import {
  CampaignStatus,
  CampaignFailureOrigin,
  GenerationFailureCode,
} from '../campaign-status.js';
import {
  InvalidCampaignError,
  InvalidCampaignTransitionError,
  InvalidPublicationSummaryError,
  StalePublicationSummaryError,
  PromotionExpiredError,
} from '../errors/campaign.errors.js';
import {
  domainFixture,
  NOW,
  LATER,
  EXPIRES,
  CONTENT,
  GENERATION,
  NEXT_GENERATION,
  OTHER_ORG,
  testId,
} from '../../../../../test/support/campaign-fakes.js';
import {
  pendingPublications,
  publicationCampaign,
  summary,
  ACCOUNT_ONE,
  ACCOUNT_TWO,
  ATTEMPT_ONE,
  ATTEMPT_TWO,
  RETRY,
} from '../../../../../test/support/publication-fixtures.js';

function outcomes() {
  const [first, second] = pendingPublications();
  const publishing = publicationCampaign().startPublication(summary(first, second), new Date(NOW));
  const one = first.startAttempt(ATTEMPT_ONE, new Date(NOW));
  const two = second.startAttempt(ATTEMPT_TWO, new Date(NOW));
  const success = one.recordSuccess(ATTEMPT_ONE, 'post-one', new Date(NOW));
  const failure = two.recordFailure(
    ATTEMPT_TWO,
    PublicationFailureCode.RATE_LIMITED,
    new Date(NOW),
  );
  const partial = publishing.recordPublicationSummary(summary(success, failure), new Date(NOW));
  return { first, second, publishing, one, two, success, failure, partial };
}

describe('Campaign publication', () => {
  it('fixes account destinations in the approval and clears them on regeneration', () => {
    const { pending, snapshot } = domainFixture();
    const destinations = [ACCOUNT_ONE, ACCOUNT_TWO];
    const approved = pending.approve(CONTENT, new Date(NOW), destinations);
    destinations.length = 0;
    expect(approved.approvedSocialAccountIds).toEqual([ACCOUNT_ONE, ACCOUNT_TWO]);
    expect(() => Object.assign(approved.approvedSocialAccountIds, { 0: testId(999) })).toThrow(
      TypeError,
    );
    expect(() => pending.approve(CONTENT, new Date(NOW), [ACCOUNT_ONE, ACCOUNT_ONE])).toThrow(
      InvalidCampaignError,
    );
    const regenerated = approved.requestRegeneration(NEXT_GENERATION, snapshot, new Date(NOW));
    expect(regenerated.approvedSocialAccountIds).toEqual([]);
    expect(regenerated.approvedContentId).toBeNull();
  });

  it('requires at least one approved destination and the exact approved set', () => {
    const entries = summary(...pendingPublications());
    expect(() => domainFixture().approved.startPublication(entries, new Date(NOW))).toThrow(
      InvalidPublicationSummaryError,
    );
    expect(() => publicationCampaign().startPublication([], new Date(NOW))).toThrow(
      InvalidPublicationSummaryError,
    );
    expect(() =>
      publicationCampaign().startPublication(entries.slice(0, 1), new Date(NOW)),
    ).toThrow(InvalidPublicationSummaryError);
    const approved = domainFixture().pending.approve(CONTENT, new Date(NOW), [ACCOUNT_ONE]);
    expect(approved.startPublication(entries.slice(0, 1), new Date(NOW)).status).toBe(
      CampaignStatus.PUBLISHING,
    );
  });

  it.each(['draft', 'generating', 'pending', 'failed'] as const)(
    'cannot start publication from %s',
    (state) => {
      expect(() =>
        domainFixture()[state].startPublication(summary(...pendingPublications()), new Date(NOW)),
      ).toThrow(InvalidCampaignTransitionError);
    },
  );

  it.each([
    { organizationId: OTHER_ORG },
    { campaignId: testId(999) },
    { approvedContentId: testId(999) },
    { socialAccountId: testId(999) },
    { status: PublicationStatus.PUBLISHED },
    { version: 1 },
    { version: -1 },
    { version: 1.5 },
  ])('rejects an unrelated or already used publication when starting: %j', (change) => {
    const entries = summary(...pendingPublications());
    entries[0] = { ...entries[0]!, ...change };
    expect(() => publicationCampaign().startPublication(entries, new Date(NOW))).toThrow(
      InvalidPublicationSummaryError,
    );
  });

  it('rejects duplicate publication IDs or destinations', () => {
    const entries = summary(...pendingPublications());
    expect(() =>
      publicationCampaign().startPublication(
        [entries[0]!, { ...entries[1]!, publicationId: entries[0]!.publicationId }],
        new Date(NOW),
      ),
    ).toThrow(InvalidPublicationSummaryError);
    expect(() =>
      publicationCampaign().startPublication(
        [entries[0]!, { ...entries[1]!, socialAccountId: ACCOUNT_ONE }],
        new Date(NOW),
      ),
    ).toThrow(InvalidPublicationSummaryError);
  });

  it('stays publishing while any destination is pending or in progress', () => {
    const { publishing, one, second, success, failure } = outcomes();
    expect(
      publishing.recordPublicationSummary(summary(success, second), new Date(NOW)).status,
    ).toBe(CampaignStatus.PUBLISHING);
    expect(publishing.recordPublicationSummary(summary(one, failure), new Date(NOW)).status).toBe(
      CampaignStatus.PUBLISHING,
    );
    const pending = pendingPublications()[0];
    expect(
      publishing.recordPublicationSummary(summary(pending, failure), new Date(NOW)).status,
    ).toBe(CampaignStatus.PUBLISHING);
  });

  it('summarizes mixed results only after every destination finishes', () => {
    const { publishing, partial, success, failure } = outcomes();
    expect(partial.status).toBe(CampaignStatus.PARTIALLY_PUBLISHED);
    expect(partial.failureOrigin).toBe(CampaignFailureOrigin.PUBLICATION);
    expect(partial.approvedContentId).toBe(CONTENT);
    expect(partial.generationFailure).toBeNull();
    expect(publishing.status).toBe(CampaignStatus.PUBLISHING);
    expect(partial.recordPublicationSummary(summary(failure, success), new Date(LATER))).toBe(
      partial,
    );
  });

  it('retries only failed destinations, preserving successful publication and approval', () => {
    const { partial, success, failure } = outcomes();
    const retry = failure.startAttempt(RETRY, new Date(LATER));
    const campaign = partial.retryPublication(summary(success, retry), new Date(LATER));
    expect(campaign.status).toBe(CampaignStatus.PUBLISHING);
    expect(campaign.failureOrigin).toBeNull();
    expect(campaign.approvedContentId).toBe(CONTENT);
    expect(campaign.approvedSocialAccountIds).toEqual([ACCOUNT_ONE, ACCOUNT_TWO]);
    expect(campaign.publicationProgress!.entries[0]).toEqual(
      partial.publicationProgress!.entries[0],
    );
    expect(() =>
      campaign.recordPublicationSummary(summary(success, failure), new Date(LATER)),
    ).toThrow(StalePublicationSummaryError);
    const published = retry.recordSuccess(RETRY, 'post-two', new Date(LATER));
    const complete = campaign.recordPublicationSummary(
      summary(success, published),
      new Date(LATER),
    );
    expect(complete.status).toBe(CampaignStatus.PUBLISHED);
    expect(complete.failureOrigin).toBeNull();
  });

  it('distinguishes all-publication failures from a generation failure', () => {
    const { publishing, one, failure } = outcomes();
    const firstFailure = one.recordFailure(
      ATTEMPT_ONE,
      PublicationFailureCode.REJECTED,
      new Date(NOW),
    );
    const failed = publishing.recordPublicationSummary(
      summary(firstFailure, failure),
      new Date(NOW),
    );
    expect(failed.status).toBe(CampaignStatus.FAILED);
    expect(failed.failureOrigin).toBe(CampaignFailureOrigin.PUBLICATION);
    const { snapshot, failed: generationFailure } = domainFixture();
    expect(generationFailure.failureOrigin).toBe(CampaignFailureOrigin.GENERATION);
    expect(() => failed.requestGeneration(NEXT_GENERATION, snapshot, new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
    expect(() =>
      failed.recordGenerationFailure(GENERATION, GenerationFailureCode.TIMEOUT, new Date(LATER)),
    ).toThrow(InvalidCampaignTransitionError);
    expect(() => generationFailure.retryPublication([], new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
    const retryEntries = summary(
      firstFailure.startAttempt(testId(304), new Date(LATER)),
      failure.startAttempt(RETRY, new Date(LATER)),
    );
    expect(failed.retryPublication(retryEntries, new Date(LATER)).status).toBe(
      CampaignStatus.PUBLISHING,
    );
  });

  it('makes an entirely published campaign terminal and repeated summary delivery harmless', () => {
    const { publishing, success, two } = outcomes();
    const entries = summary(success, two.recordSuccess(ATTEMPT_TWO, 'post-two', new Date(NOW)));
    const published = publishing.recordPublicationSummary(entries, new Date(NOW));
    expect(published.status).toBe(CampaignStatus.PUBLISHED);
    expect(published.recordPublicationSummary([...entries].reverse(), new Date(LATER))).toBe(
      published,
    );
    const { snapshot } = domainFixture();
    expect(() =>
      published.startPublication(summary(...pendingPublications()), new Date(LATER)),
    ).toThrow(InvalidCampaignTransitionError);
    expect(() => published.retryPublication(entries, new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
    expect(() => published.requestGeneration(NEXT_GENERATION, snapshot, new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
    expect(() => published.requestRegeneration(NEXT_GENERATION, snapshot, new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
    expect(() => published.approve(CONTENT, new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
  });

  it('blocks regeneration, another start, and early retries while a publication is running', () => {
    const { publishing, success, failure } = outcomes();
    expect(() =>
      publishing.startPublication(summary(...pendingPublications()), new Date(NOW)),
    ).toThrow(InvalidCampaignTransitionError);
    expect(() =>
      publishing.requestRegeneration(NEXT_GENERATION, domainFixture().snapshot, new Date(NOW)),
    ).toThrow(InvalidCampaignTransitionError);
    expect(() =>
      publishing.retryPublication(
        summary(success, failure.startAttempt(RETRY, new Date(LATER))),
        new Date(LATER),
      ),
    ).toThrow(InvalidCampaignTransitionError);
  });

  it.each([
    { publicationId: testId(999) },
    { organizationId: OTHER_ORG },
    { campaignId: testId(999) },
    { approvedContentId: testId(999) },
    { socialAccountId: testId(999) },
  ])('rejects summary identity changes: %j', (change) => {
    const { publishing, success, failure } = outcomes();
    const entries = summary(success, failure);
    entries[0] = { ...entries[0]!, ...change };
    expect(() => publishing.recordPublicationSummary(entries, new Date(NOW))).toThrow(
      InvalidPublicationSummaryError,
    );
  });

  it('rejects incomplete summaries and regressions even when a caller supplies a newer version', () => {
    const { publishing, success, failure, partial } = outcomes();
    expect(() => publishing.recordPublicationSummary(summary(success), new Date(NOW))).toThrow(
      InvalidPublicationSummaryError,
    );
    const entries = summary(success, failure);
    entries[0] = { ...entries[0]!, status: PublicationStatus.FAILED, version: success.version + 1 };
    expect(() => partial.recordPublicationSummary(entries, new Date(LATER))).toThrow(
      InvalidPublicationSummaryError,
    );
    entries[0] = { ...entries[0]!, version: success.version };
    expect(() => partial.recordPublicationSummary(entries, new Date(LATER))).toThrow(
      InvalidPublicationSummaryError,
    );
  });

  it('requires the explicit retry operation and prevents replacing successful destinations', () => {
    const { partial, success, failure } = outcomes();
    const retry = failure.startAttempt(RETRY, new Date(LATER));
    expect(() =>
      partial.recordPublicationSummary(summary(success, retry), new Date(LATER)),
    ).toThrow(InvalidPublicationSummaryError);
    expect(() => partial.retryPublication(summary(success, failure), new Date(LATER))).toThrow(
      InvalidPublicationSummaryError,
    );
    const entries = summary(success, retry);
    entries[0] = {
      ...entries[0]!,
      status: PublicationStatus.PUBLISHING,
      version: success.version + 1,
    };
    expect(() => partial.retryPublication(entries, new Date(LATER))).toThrow(
      InvalidPublicationSummaryError,
    );
  });

  it('rechecks offer expiry at initial start and retry, but accepts results of an earlier valid send', () => {
    const { partial, success, failure, publishing, two } = outcomes();
    const expired = new Date(EXPIRES);
    expect(() =>
      publicationCampaign().startPublication(summary(...pendingPublications()), expired),
    ).toThrow(PromotionExpiredError);
    expect(() =>
      partial.retryPublication(summary(success, failure.startAttempt(RETRY, expired)), expired),
    ).toThrow(PromotionExpiredError);
    const lastResult = two.recordSuccess(ATTEMPT_TWO, 'post-two', expired);
    expect(publishing.recordPublicationSummary(summary(success, lastResult), expired).status).toBe(
      CampaignStatus.PUBLISHED,
    );
  });

  it('protects dates and summary data from external mutation, including application results', () => {
    const entries = summary(...pendingPublications());
    const campaign = publicationCampaign().startPublication(entries, new Date(NOW));
    entries[0]!.status = PublicationStatus.PUBLISHED;
    expect(campaign.publicationProgress!.entries[0]!.status).toBe(PublicationStatus.PENDING);
    expect(() => Object.assign(campaign.publicationProgress!.entries[0]!, { version: 99 })).toThrow(
      TypeError,
    );
    const result = campaignResult(campaign);
    result.publications[0]!.version = 99;
    result.approvedSocialAccountIds.length = 0;
    expect(campaign.publicationProgress!.entries[0]!.version).toBe(0);
    expect(campaign.approvedSocialAccountIds).toHaveLength(2);
    expect(() =>
      publicationCampaign().startPublication(
        summary(...pendingPublications()),
        new Date('2026-09-17'),
      ),
    ).toThrow(InvalidTimestampError);
    const { publishing, success, failure } = outcomes();
    expect(() =>
      publishing.recordPublicationSummary(summary(success, failure), new Date(NaN)),
    ).toThrow(InvalidTimestampError);
  });
});
