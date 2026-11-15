import { Campaign } from '#app/modules/campaigns/domain/entities/campaign';
import { GeneratedContent } from '#app/modules/campaigns/domain/entities/generated-content';
import { GenerationSnapshot } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import {
  CampaignStatus,
  GenerationFailureCode,
} from '#app/modules/campaigns/domain/campaign-status';
import {
  InvalidCampaignError,
  InvalidCampaignTransitionError,
  ContentRevisionMismatchError,
  ConflictingGenerationResultError,
  StaleGenerationResultError,
  PromotionExpiredError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import { InvalidTimestampError } from '#app/domain/timestamp';
import {
  domainFixture,
  resourcesFixture,
  createInput,
  payloadFixture,
  CAMPAIGN,
  ORG,
  CONTENT,
  GENERATION,
  NEXT_GENERATION,
  NOW,
  LATER,
  EXPIRES,
  testId,
  briefOf,
} from '../../../../support/campaign-fakes.js';

describe('Campaign', () => {
  it('starts as a draft with a normalized brief and no generated content', () => {
    const { draft } = domainFixture();
    expect(draft.title).toBe('Campaña');
    expect(draft.status).toBe(CampaignStatus.DRAFT);
    expect(draft.version).toBe(0);
    expect(draft.generation).toBeNull();
    expect(draft.candidateContent).toBeNull();
    expect(draft.approvedContentId).toBeNull();
    draft.createdAt.setUTCFullYear(2000);
    expect(draft.createdAt.toISOString()).toBe(NOW);
  });

  it.each([{ title: ' ' }, { cta: ' ' }])('requires a usable brief: %j', (changes) => {
    expect(() =>
      Campaign.create(CAMPAIGN, { ...createInput(), promotion: null, ...changes }, new Date(NOW)),
    ).toThrow(InvalidCampaignError);
  });

  it('moves through generation, review and exact content approval without mutating previous versions', () => {
    const { draft, generating, pending, approved } = domainFixture();
    expect([draft.status, generating.status, pending.status, approved.status]).toEqual([
      CampaignStatus.DRAFT,
      CampaignStatus.GENERATING,
      CampaignStatus.PENDING_APPROVAL,
      CampaignStatus.APPROVED,
    ]);
    expect([draft.version, generating.version, pending.version, approved.version]).toEqual([
      0, 1, 2, 3,
    ]);
    expect(approved.approvedContentId).toBe(CONTENT);
    expect(pending.approvedContentId).toBeNull();
    expect(generating.generation?.id).toBe(GENERATION);
    expect(() => pending.approve(testId(50), new Date(NOW))).toThrow(ContentRevisionMismatchError);
  });

  it.each(['generating', 'pending', 'approved'] as const)(
    'rejects normal generation from %s',
    (state) => {
      const fixture = domainFixture();
      expect(() =>
        fixture[state].requestGeneration(NEXT_GENERATION, fixture.snapshot, new Date(LATER)),
      ).toThrow(InvalidCampaignTransitionError);
    },
  );

  it.each(['draft', 'generating', 'approved', 'failed'] as const)(
    'rejects approval from %s',
    (state) => {
      expect(() => domainFixture()[state].approve(CONTENT, new Date(LATER))).toThrow(
        InvalidCampaignTransitionError,
      );
    },
  );

  it('rejects regeneration from draft', () => {
    const fixture = domainFixture();
    expect(() =>
      fixture.draft.requestRegeneration(NEXT_GENERATION, fixture.snapshot, new Date(LATER)),
    ).toThrow(InvalidCampaignTransitionError);
  });

  // ADR-0026: una regeneración fallida o trabada se puede reintentar con otra versión.
  it.each(['generating', 'failed'] as const)('regenerates from %s', (state) => {
    const fixture = domainFixture();
    const next = fixture[state].requestRegeneration(
      NEXT_GENERATION,
      fixture.snapshot,
      new Date(LATER),
    );
    expect(next.status).toBe(CampaignStatus.GENERATING);
    expect(next.generation?.number).toBe(2);
    expect(next.generationFailure).toBeNull();
  });

  describe('restoreVersion', () => {
    it('makes an earlier version current again, pending approval, without reusing its number', () => {
      const { approved, content, snapshot } = domainFixture();
      const first = approved.generation!;
      const regenerating = approved.requestRegeneration(NEXT_GENERATION, snapshot, new Date(LATER));
      const restored = regenerating.restoreVersion(first, content, new Date(LATER));
      expect(restored.status).toBe(CampaignStatus.PENDING_APPROVAL);
      expect(restored.generation).toEqual(first);
      expect(restored.candidateContent).toBe(content);
      expect(restored.approvedContentId).toBeNull();
      expect(restored.lastGenerationNumber).toBe(2);
      // La siguiente versión usa el número más alto, no el de la vigente.
      const third = restored.requestRegeneration(
        '00000000-0000-4000-8000-000000000333',
        snapshot,
        new Date(LATER),
      );
      expect(third.generation?.number).toBe(3);
    });
    it('removes an existing approval and is a no-op for the current candidate', () => {
      const { approved, pending, content } = domainFixture();
      const restored = approved.restoreVersion(approved.generation!, content, new Date(LATER));
      expect(restored.status).toBe(CampaignStatus.PENDING_APPROVAL);
      expect(restored.approvedContentId).toBeNull();
      expect(pending.restoreVersion(pending.generation!, content, new Date(LATER))).toBe(pending);
    });
    it('rejects drafts and content from another generation', () => {
      const { draft, approved, content, snapshot } = domainFixture();
      expect(() => draft.restoreVersion(approved.generation!, content, new Date(LATER))).toThrow(
        InvalidCampaignTransitionError,
      );
      const regenerating = approved.requestRegeneration(NEXT_GENERATION, snapshot, new Date(LATER));
      expect(() =>
        regenerating.restoreVersion(regenerating.generation!, content, new Date(LATER)),
      ).toThrow(ContentRevisionMismatchError);
    });
  });

  it.each(['pending', 'approved'] as const)(
    'regenerates from %s and requires another approval',
    (state) => {
      const fixture = domainFixture();
      const next = fixture[state].requestRegeneration(
        NEXT_GENERATION,
        fixture.snapshot,
        new Date(LATER),
      );
      expect(next.status).toBe(CampaignStatus.GENERATING);
      expect(next.generation?.number).toBe(2);
      expect(next.candidateContent).toBeNull();
      expect(next.approvedContentId).toBeNull();
      expect(fixture[state].candidateContent?.id).toBe(CONTENT);
      expect(() => next.recordGeneratedContent(fixture.content, new Date(LATER))).toThrow(
        StaleGenerationResultError,
      );
    },
  );

  it('accepts identical repeated results even after approval and rejects contradictory output', () => {
    const { approved, content, snapshot } = domainFixture();
    expect(approved.recordGeneratedContent(content, new Date(LATER))).toBe(approved);
    const conflict = GeneratedContent.create(
      {
        id: CONTENT,
        organizationId: ORG,
        campaignId: CAMPAIGN,
        generationId: GENERATION,
        revision: 1,
      },
      snapshot,
      { ...payloadFixture(), caption: 'Changed' },
      new Date(LATER),
    );
    expect(() => approved.recordGeneratedContent(conflict, new Date(LATER))).toThrow(
      ConflictingGenerationResultError,
    );
    expect(() =>
      approved.recordGenerationFailure(GENERATION, GenerationFailureCode.TIMEOUT, new Date(LATER)),
    ).toThrow(InvalidCampaignTransitionError);
  });

  it.each([{ campaignId: testId(90) }, { revision: 2 }])(
    'rejects results for another campaign or revision: %j',
    (changes) => {
      const { generating, snapshot } = domainFixture();
      const content = GeneratedContent.create(
        {
          id: CONTENT,
          organizationId: ORG,
          campaignId: CAMPAIGN,
          generationId: GENERATION,
          revision: 1,
          ...changes,
        },
        snapshot,
        payloadFixture(),
        new Date(NOW),
      );
      expect(() => generating.recordGeneratedContent(content, new Date(NOW))).toThrow(
        ContentRevisionMismatchError,
      );
    },
  );

  it('rejects a snapshot that does not match the campaign brief or generation input', () => {
    const { draft, generating, promotion } = domainFixture();
    const different = GenerationSnapshot.capture(
      resourcesFixture(),
      briefOf('Changed instructions', draft.cta, promotion),
    );
    expect(() => draft.requestGeneration(GENERATION, different, new Date(NOW))).toThrow(
      InvalidCampaignError,
    );
    const content = GeneratedContent.create(
      {
        id: CONTENT,
        organizationId: ORG,
        campaignId: CAMPAIGN,
        generationId: GENERATION,
        revision: 1,
      },
      different,
      payloadFixture(),
      new Date(NOW),
    );
    expect(() => generating.recordGeneratedContent(content, new Date(NOW))).toThrow(
      ContentRevisionMismatchError,
    );
  });

  it('records a stable failure and retries with a new operation, rejecting late results', () => {
    const { failed, snapshot, content } = domainFixture();
    expect(failed.generationFailure).toBe(GenerationFailureCode.TIMEOUT);
    expect(
      failed.recordGenerationFailure(GENERATION, GenerationFailureCode.TIMEOUT, new Date(LATER)),
    ).toBe(failed);
    expect(() =>
      failed.recordGenerationFailure(
        GENERATION,
        GenerationFailureCode.INVALID_OUTPUT,
        new Date(LATER),
      ),
    ).toThrow(ConflictingGenerationResultError);
    expect(() => failed.recordGeneratedContent(content, new Date(LATER))).toThrow(
      InvalidCampaignTransitionError,
    );
    expect(() => failed.requestGeneration(GENERATION, snapshot, new Date(LATER))).toThrow(
      InvalidCampaignError,
    );
    const next = failed.requestGeneration(NEXT_GENERATION, snapshot, new Date(LATER));
    expect(next.generationFailure).toBeNull();
    expect(next.generation?.number).toBe(2);
    expect(() =>
      next.recordGenerationFailure(GENERATION, GenerationFailureCode.TIMEOUT, new Date(LATER)),
    ).toThrow(StaleGenerationResultError);
  });

  it('rejects expired offers when creating, generating, approving or regenerating', () => {
    const { draft, pending, approved, promotion, snapshot } = domainFixture();
    const expired = new Date(EXPIRES);
    expect(() => Campaign.create(CAMPAIGN, { ...createInput(), promotion }, expired)).toThrow(
      PromotionExpiredError,
    );
    expect(() => draft.requestGeneration(GENERATION, snapshot, expired)).toThrow(
      PromotionExpiredError,
    );
    expect(() => pending.approve(CONTENT, expired)).toThrow(PromotionExpiredError);
    expect(() => approved.requestRegeneration(NEXT_GENERATION, snapshot, expired)).toThrow(
      PromotionExpiredError,
    );
  });

  it('rejects invalid timestamps and events that precede their generation', () => {
    const { draft, snapshot } = domainFixture();
    expect(() => draft.requestGeneration(GENERATION, snapshot, new Date(NaN))).toThrow(
      InvalidTimestampError,
    );
    expect(() => draft.requestGeneration(GENERATION, snapshot, new Date('2026-09-17'))).toThrow(
      InvalidTimestampError,
    );
    const generating = draft.requestGeneration(GENERATION, snapshot, new Date(LATER));
    const { content } = domainFixture();
    expect(() => generating.recordGeneratedContent(content, new Date(LATER))).toThrow(
      InvalidTimestampError,
    );
  });
});
