import { PublicationMapper, type PublicationRecord } from './publication.mapper.js';
import { PublicationStatus } from '#app/domain/publication-status';
import { PublicationFailureCode } from '../../../domain/entities/publication.js';
import {
  pendingPublications,
  ATTEMPT_ONE,
  RETRY,
} from '../../../../../../test/support/publication-fixtures.js';
import { publicationState } from '../../../../../../test/support/publication-restoration.js';
import { NOW, LATER, testId } from '../../../../../../test/support/campaign-fakes.js';

function fixtures() {
  const pending = pendingPublications()[0];
  const active = pending.startAttempt(ATTEMPT_ONE, new Date(NOW));
  const failed = active.recordFailure(
    ATTEMPT_ONE,
    PublicationFailureCode.RATE_LIMITED,
    new Date(LATER),
  );
  return [
    pending,
    active,
    failed,
    active.recordSuccess(ATTEMPT_ONE, 'post-1', new Date(LATER)),
    failed.startAttempt(RETRY, new Date(LATER)),
  ];
}
function row(index: number): PublicationRecord {
  const publication = fixtures()[index]!;
  return {
    ...PublicationMapper.toPersistence(publication),
    currentAttempt: publication.attempt
      ? {
          ...PublicationMapper.attempt(publication),
          result: [PublicationStatus.PUBLISHED, PublicationStatus.FAILED].includes(
            publication.status,
          )
            ? PublicationMapper.result(publication)
            : null,
        }
      : null,
  };
}

describe('PublicationMapper', () => {
  it.each([0, 1, 2, 3, 4])('preserves dates, attempt numbers and results for state %s', (index) => {
    expect(publicationState(PublicationMapper.toDomain(row(index)))).toEqual(
      publicationState(fixtures()[index]!),
    );
  });
  it('rejects mismatched pointers, owners, results and precision loss', () => {
    const original = row(3);
    for (const value of [
      { ...original, version: 9007199254740992n },
      { ...original, currentAttemptId: testId(900) },
      { ...original, currentAttempt: null },
      {
        ...original,
        currentAttempt: { ...original.currentAttempt!, organizationId: testId(901) },
      },
      { ...original, currentAttempt: { ...original.currentAttempt!, result: null } },
      {
        ...original,
        currentAttempt: {
          ...original.currentAttempt!,
          result: { ...original.currentAttempt!.result!, externalPostId: 'other' },
        },
      },
    ]) {
      expect(() => PublicationMapper.toDomain(value)).toThrow();
    }
  });
});
