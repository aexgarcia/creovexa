import { GeneratedContent } from './generated-content.js';
import { IncompleteGeneratedContentError } from '../errors/campaign.errors.js';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import {
  domainFixture,
  payloadFixture,
  CONTENT,
  ORG,
  CAMPAIGN,
  GENERATION,
  ASSET,
  NOW,
  LATER,
  OTHER_ORG,
  testId,
} from '../../../../../test/support/campaign-fakes.js';

const identity = {
  id: CONTENT,
  organizationId: ORG,
  campaignId: CAMPAIGN,
  generationId: GENERATION,
  revision: 1,
};

describe('GeneratedContent', () => {
  it('keeps the complete result immutable, including arrays and dates', () => {
    const { snapshot } = domainFixture();
    const payload = { ...payloadFixture(), hashtags: ['#oferta'], assetIds: [ASSET] };
    const at = new Date(NOW);
    const content = GeneratedContent.create(identity, snapshot, payload, at);
    payload.hashtags.push('#changed');
    payload.assetIds.length = 0;
    at.setUTCFullYear(2000);
    content.createdAt.setUTCFullYear(2000);
    expect(content.hashtags).toEqual(['#oferta']);
    expect(content.assetIds).toEqual([ASSET]);
    expect(content.createdAt.toISOString()).toBe(NOW);
    expect(() => Object.assign(content, { caption: 'changed' })).toThrow(TypeError);
    expect(() => Object.assign(content.hashtags, { 0: '#changed' })).toThrow(TypeError);
  });

  it.each([
    { headline: ' ' },
    { caption: ' ' },
    { cta: 'Otro CTA' },
    { hashtags: [' '] },
    { assetIds: [] },
    { assetIds: [ASSET, ASSET] },
  ])('rejects an incomplete or inconsistent result: %j', (changes) => {
    expect(() =>
      GeneratedContent.create(
        identity,
        domainFixture().snapshot,
        { ...payloadFixture(), ...changes },
        new Date(NOW),
      ),
    ).toThrow(IncompleteGeneratedContentError);
  });

  it.each([0, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects an invalid revision: %s', (revision) => {
    expect(() =>
      GeneratedContent.create(
        { ...identity, revision },
        domainFixture().snapshot,
        payloadFixture(),
        new Date(NOW),
      ),
    ).toThrow(IncompleteGeneratedContentError);
  });

  it('checks ownership and stable asset identities', () => {
    const { snapshot } = domainFixture();
    expect(() =>
      GeneratedContent.create(
        { ...identity, organizationId: OTHER_ORG },
        snapshot,
        payloadFixture(),
        new Date(NOW),
      ),
    ).toThrow(IncompleteGeneratedContentError);
    expect(() =>
      GeneratedContent.create(
        identity,
        snapshot,
        { ...payloadFixture(), assetIds: ['https://example.test/image'] },
        new Date(NOW),
      ),
    ).toThrow(InvalidEntityIdError);
  });

  it('recognizes repeated output independently of a delivery time or allocated ID', () => {
    const { content, snapshot } = domainFixture();
    const repeated = GeneratedContent.create(
      { ...identity, id: testId(99) },
      snapshot,
      payloadFixture(),
      new Date(LATER),
    );
    expect(content.sameResult(repeated)).toBe(true);
    const conflict = GeneratedContent.create(
      identity,
      snapshot,
      { ...payloadFixture(), caption: 'Otro texto' },
      new Date(LATER),
    );
    expect(content.sameResult(conflict)).toBe(false);
  });
});
