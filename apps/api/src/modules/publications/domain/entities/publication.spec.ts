import { Publication, PublicationFailureCode } from './publication.js';
import { PublicationStatus } from '#app/domain/publication-status';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import { InvalidTimestampError } from '#app/domain/timestamp';
import { SocialPlatform } from '../social-platform.js';
import {
  InvalidPublicationError,
  InvalidPublicationTransitionError,
  StalePublicationAttemptError,
  ConflictingPublicationResultError,
} from '../errors/publication.errors.js';
import {
  ORG,
  CAMPAIGN,
  CONTENT,
  NOW,
  LATER,
  testId,
} from '../../../../../test/support/campaign-fakes.js';
import {
  pendingPublications,
  ACCOUNT_ONE,
  ATTEMPT_ONE,
  RETRY,
} from '../../../../../test/support/publication-fixtures.js';

describe('Publication', () => {
  it('begins pending for one account and one approved revision', () => {
    const [publication] = pendingPublications();
    expect(publication.status).toBe(PublicationStatus.PENDING);
    expect(publication.socialAccountId).toBe(ACCOUNT_ONE);
    expect(publication.approvedContentId).toBe(CONTENT);
    expect(publication.version).toBe(0);
    expect(publication.attempt).toBeNull();
    expect(publication.publishedAt).toBeNull();
    expect(publication.externalPostId).toBeNull();
    expect(publication.failureCode).toBeNull();
  });

  it.each(Object.values(SocialPlatform))(
    'represents the %s platform without a provider client',
    (platform) => {
      const publication = Publication.create(
        testId(400),
        {
          organizationId: ORG,
          campaignId: CAMPAIGN,
          approvedContentId: CONTENT,
          socialAccountId: ACCOUNT_ONE,
          platform,
        },
        new Date(NOW),
      );
      expect(publication.platform).toBe(platform);
    },
  );

  it.each([
    { changes: { organizationId: 'invalid' }, error: InvalidEntityIdError },
    { changes: { approvedContentId: 'invalid' }, error: InvalidEntityIdError },
    { changes: { socialAccountId: 'invalid' }, error: InvalidEntityIdError },
    { changes: { platform: 'UNKNOWN' as SocialPlatform }, error: InvalidPublicationError },
  ])('rejects invalid references and platforms: %j', ({ changes, error }) => {
    expect(() =>
      Publication.create(
        testId(400),
        {
          organizationId: ORG,
          campaignId: CAMPAIGN,
          approvedContentId: CONTENT,
          socialAccountId: ACCOUNT_ONE,
          platform: SocialPlatform.FACEBOOK,
          ...changes,
        },
        new Date(NOW),
      ),
    ).toThrow(error);
  });

  it('records success once and preserves identities and previous versions', () => {
    const [pending] = pendingPublications();
    const publishing = pending.startAttempt(ATTEMPT_ONE, new Date(NOW));
    const published = publishing.recordSuccess(ATTEMPT_ONE, ' post-123 ', new Date(LATER));
    expect(pending.status).toBe(PublicationStatus.PENDING);
    expect(publishing.status).toBe(PublicationStatus.PUBLISHING);
    expect(published.status).toBe(PublicationStatus.PUBLISHED);
    expect(published.id).toBe(pending.id);
    expect(published.externalPostId).toBe('post-123');
    expect(published.publishedAt!.toISOString()).toBe(LATER);
    expect(published.version).toBe(2);
    expect(published.recordSuccess(ATTEMPT_ONE, 'post-123', new Date('2026-09-19'))).toBe(
      published,
    );
    expect(() => published.startAttempt(RETRY, new Date(LATER))).toThrow(
      InvalidPublicationTransitionError,
    );
    expect(() => published.recordSuccess(ATTEMPT_ONE, 'another-post', new Date(LATER))).toThrow(
      ConflictingPublicationResultError,
    );
    expect(() =>
      published.recordFailure(ATTEMPT_ONE, PublicationFailureCode.REJECTED, new Date(LATER)),
    ).toThrow(ConflictingPublicationResultError);
  });

  it('retries a confirmed failure using the same publication and a new attempt', () => {
    const [pending] = pendingPublications();
    const failed = pending
      .startAttempt(ATTEMPT_ONE, new Date(NOW))
      .recordFailure(ATTEMPT_ONE, PublicationFailureCode.RATE_LIMITED, new Date(NOW));
    expect(failed.failureCode).toBe(PublicationFailureCode.RATE_LIMITED);
    expect(
      failed.recordFailure(ATTEMPT_ONE, PublicationFailureCode.RATE_LIMITED, new Date(LATER)),
    ).toBe(failed);
    expect(() =>
      failed.recordFailure(ATTEMPT_ONE, PublicationFailureCode.REJECTED, new Date(LATER)),
    ).toThrow(ConflictingPublicationResultError);
    expect(() => failed.recordSuccess(ATTEMPT_ONE, 'late-success', new Date(LATER))).toThrow(
      ConflictingPublicationResultError,
    );
    expect(() => failed.startAttempt(ATTEMPT_ONE, new Date(LATER))).toThrow(
      InvalidPublicationError,
    );
    const retry = failed.startAttempt(RETRY, new Date(LATER));
    expect(retry.id).toBe(pending.id);
    expect(retry.approvedContentId).toBe(CONTENT);
    expect(retry.socialAccountId).toBe(ACCOUNT_ONE);
    expect(retry.attempt).toMatchObject({ id: RETRY, number: 2 });
    expect(retry.failureCode).toBeNull();
    expect(retry.version).toBe(3);
    expect(() => retry.recordSuccess(ATTEMPT_ONE, 'late-success', new Date(LATER))).toThrow(
      StalePublicationAttemptError,
    );
    expect(() =>
      retry.recordFailure(ATTEMPT_ONE, PublicationFailureCode.REJECTED, new Date(LATER)),
    ).toThrow(StalePublicationAttemptError);
    expect(retry.recordSuccess(RETRY, 'new-post', new Date(LATER)).status).toBe(
      PublicationStatus.PUBLISHED,
    );
  });

  it('requires an active attempt before a result and rejects a second active attempt', () => {
    const [pending] = pendingPublications();
    expect(() => pending.recordSuccess(ATTEMPT_ONE, 'post', new Date(NOW))).toThrow(
      StalePublicationAttemptError,
    );
    expect(() =>
      pending.recordFailure(ATTEMPT_ONE, PublicationFailureCode.REJECTED, new Date(NOW)),
    ).toThrow(StalePublicationAttemptError);
    expect(() =>
      pending.startAttempt(ATTEMPT_ONE, new Date(NOW)).startAttempt(RETRY, new Date(NOW)),
    ).toThrow(InvalidPublicationTransitionError);
  });

  it('rejects empty success references and unclassified failures', () => {
    const publication = pendingPublications()[0].startAttempt(ATTEMPT_ONE, new Date(NOW));
    expect(() => publication.recordSuccess(ATTEMPT_ONE, ' ', new Date(NOW))).toThrow(
      InvalidPublicationError,
    );
    expect(() =>
      publication.recordFailure(ATTEMPT_ONE, 'TIMEOUT' as PublicationFailureCode, new Date(NOW)),
    ).toThrow(InvalidPublicationError);
  });

  it('rejects invalid or backwards timestamps and exposes immutable attempt metadata', () => {
    const [pending] = pendingPublications();
    expect(() => pending.startAttempt(ATTEMPT_ONE, new Date(NaN))).toThrow(InvalidTimestampError);
    expect(() => pending.startAttempt(ATTEMPT_ONE, new Date('2026-09-17'))).toThrow(
      InvalidTimestampError,
    );
    const at = new Date(LATER);
    const publishing = pending.startAttempt(ATTEMPT_ONE, at);
    at.setUTCFullYear(2000);
    expect(() => publishing.recordSuccess(ATTEMPT_ONE, 'post', new Date(NOW))).toThrow(
      InvalidTimestampError,
    );
    expect(() =>
      publishing.recordFailure(ATTEMPT_ONE, PublicationFailureCode.REJECTED, new Date(NOW)),
    ).toThrow(InvalidTimestampError);
    expect(() => Object.assign(publishing.attempt!, { number: 20 })).toThrow(TypeError);
    const published = publishing.recordSuccess(ATTEMPT_ONE, 'post', new Date(LATER));
    published.publishedAt!.setUTCFullYear(2000);
    published.updatedAt.setUTCFullYear(2000);
    published.createdAt.setUTCFullYear(2000);
    expect(published.publishedAt!.toISOString()).toBe(LATER);
    expect(published.updatedAt.toISOString()).toBe(LATER);
    expect(published.createdAt.toISOString()).toBe(NOW);
  });
});
