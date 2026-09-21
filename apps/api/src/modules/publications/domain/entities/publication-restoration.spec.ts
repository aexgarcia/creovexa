import { Publication, PublicationFailureCode, type PublicationState } from './publication.js';
import { PublicationStatus } from '#app/domain/publication-status';
import { publicationState } from '../../../../../test/support/publication-restoration.js';
import {
  pendingPublications,
  ATTEMPT_ONE,
  RETRY,
} from '../../../../../test/support/publication-fixtures.js';
import { NOW, LATER } from '../../../../../test/support/campaign-fakes.js';

function states() {
  const pending = pendingPublications()[0];
  const publishing = pending.startAttempt(ATTEMPT_ONE, new Date(NOW));
  const published = publishing.recordSuccess(ATTEMPT_ONE, 'post-1', new Date(LATER));
  const failed = publishing.recordFailure(
    ATTEMPT_ONE,
    PublicationFailureCode.RATE_LIMITED,
    new Date(LATER),
  );
  const retrying = failed.startAttempt(RETRY, new Date(LATER));
  return { pending, publishing, published, failed, retrying };
}

describe('Publication restoration', () => {
  it.each(['pending', 'publishing', 'published', 'failed', 'retrying'] as const)(
    'restores %s without replaying transitions',
    (name) => {
      const state = publicationState(states()[name]);
      expect(publicationState(Publication.restore(state))).toEqual(state);
    },
  );
  it.each([
    { version: -1 },
    { version: 0.5 },
    { version: NaN },
    { version: Number.MAX_SAFE_INTEGER + 1 },
    { version: 1 },
    { version: 3 },
    { attempt: null },
    { status: 'UNKNOWN' as PublicationStatus },
    { externalPostId: null },
    { externalPostId: ' ' },
    { publishedAt: null },
    { publishedAt: new Date(NOW).getTime() - 1 },
    { failureCode: PublicationFailureCode.REJECTED },
    { updatedAt: NaN },
    { updatedAt: new Date(NOW).getTime() - 1 },
  ] satisfies Partial<PublicationState>[])(
    'rejects an inconsistent published state: %j',
    (change) => {
      expect(() =>
        Publication.restore({ ...publicationState(states().published), ...change }),
      ).toThrow();
    },
  );
  it('rejects invalid attempt identities, dates and sequence numbers', () => {
    const state = publicationState(states().publishing);
    for (const change of [
      { number: 0 },
      { number: 2 },
      { number: 1.5 },
      { startedAt: state.createdAt - 1 },
      { startedAt: state.updatedAt + 1 },
    ]) {
      expect(() =>
        Publication.restore({ ...state, attempt: { ...state.attempt!, ...change } }),
      ).toThrow();
    }
  });
  it('rejects unfinished results and a failure without a controlled code', () => {
    expect(() =>
      Publication.restore({ ...publicationState(states().failed), failureCode: null }),
    ).toThrow();
    expect(() =>
      Publication.restore({
        ...publicationState(states().publishing),
        externalPostId: 'post',
      }),
    ).toThrow();
    expect(() =>
      Publication.restore({
        ...publicationState(states().pending),
        updatedAt: new Date(LATER).getTime(),
      }),
    ).toThrow();
  });
  it('keeps repeated confirmations idempotent and terminal success protected after loading', () => {
    const success = Publication.restore(publicationState(states().published));
    expect(success.recordSuccess(ATTEMPT_ONE, 'post-1', new Date(LATER))).toBe(success);
    expect(() => success.startAttempt(RETRY, new Date(LATER))).toThrow();
    const retry = Publication.restore(publicationState(states().retrying));
    expect(() => retry.recordSuccess(ATTEMPT_ONE, 'old-post', new Date(LATER))).toThrow();
  });
  it('copies attempt input and returned dates', () => {
    const state = publicationState(states().published);
    const attempt = { ...state.attempt! };
    const loaded = Publication.restore({ ...state, attempt });
    attempt.number = 30;
    loaded.publishedAt!.setFullYear(2000);
    expect(loaded.attempt!.number).toBe(1);
    expect(loaded.publishedAt!.toISOString()).toBe(LATER);
  });
});
