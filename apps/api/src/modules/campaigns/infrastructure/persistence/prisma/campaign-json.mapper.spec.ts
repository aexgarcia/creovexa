import {
  readGenerationSnapshot,
  readPromotion,
  readPublicationProgress,
} from './campaign-json.mapper.js';
import {
  domainFixture,
  ORG,
  CAMPAIGN,
  CONTENT,
  testId,
} from '../../../../../../test/support/campaign-fakes.js';

describe('Stored campaign JSON', () => {
  it('validates and reconstructs a JSON snapshot independently of property order', () => {
    const { snapshot } = domainFixture();
    const data = JSON.parse(JSON.stringify(snapshot.data)) as Record<string, unknown>;
    const reversed = Object.fromEntries(Object.entries(data).reverse());
    expect(readGenerationSnapshot(reversed).equals(snapshot)).toBe(true);
  });
  it.each([null, [], {}, { organization: null }, 'snapshot', 4])(
    'rejects malformed snapshots: %j',
    (value) => {
      expect(() => readGenerationSnapshot(value)).toThrow();
    },
  );
  it('rejects corrupted money, date strings and missing nullable fields', () => {
    const data = domainFixture().snapshot.data;
    expect(() =>
      readGenerationSnapshot({
        ...data,
        product: { ...data.product, regularPrice: { amountMinor: '2000', currency: 'PEN' } },
      }),
    ).toThrow();
    expect(() =>
      readPromotion({ amountMinor: 100, currency: 'PEN', startsAt: null, endsAt: 'invalid' }),
    ).toThrow();
    expect(() => readPromotion({ amountMinor: 100, currency: 'PEN' })).toThrow();
  });
  it('rejects invalid publication statuses and unrelated destinations', () => {
    const entry = {
      publicationId: testId(700),
      organizationId: ORG,
      campaignId: CAMPAIGN,
      approvedContentId: CONTENT,
      socialAccountId: testId(701),
      version: 2,
      status: 'UNKNOWN',
    };
    expect(() => readPublicationProgress([entry], ORG, CAMPAIGN, CONTENT, [testId(701)])).toThrow();
    expect(() =>
      readPublicationProgress([{ ...entry, status: 'PUBLISHED' }], ORG, CAMPAIGN, CONTENT, [
        testId(702),
      ]),
    ).toThrow();
  });
});
