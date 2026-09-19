import { CampaignStatus, GenerationFailureCode } from '../../domain/campaign-status.js';
import {
  CampaignNotFoundError,
  ConcurrentCampaignModificationError,
  ContentRevisionMismatchError,
  ConflictingGenerationResultError,
  IncompleteGeneratedContentError,
  InvalidCampaignTransitionError,
  InvalidPromotionError,
  PromotionExpiredError,
  StaleGenerationResultError,
} from '../../domain/errors/campaign.errors.js';
import { CampaignResourceNotFoundError } from '../errors/campaign-resource-not-found.error.js';
import {
  campaignUseCases,
  createInput,
  payloadFixture,
  domainFixture,
  CAMPAIGN,
  GENERATION,
  CONTENT,
  OTHER_ORG,
  NOW,
  LATER,
  EXPIRES,
  testId,
} from '../../../../../test/support/campaign-fakes.js';

async function setup(state: 'draft' | 'generating' | 'pending' | 'approved' = 'draft') {
  const context = campaignUseCases();
  await context.create.execute(createInput());
  if (state !== 'draft') await context.generate.execute(context.selection);
  if (state === 'pending' || state === 'approved')
    await context.record.execute({
      ...context.selection,
      generationId: GENERATION,
      content: payloadFixture(),
    });
  if (state === 'approved')
    await context.approve.execute({ ...context.selection, contentId: CONTENT });
  return context;
}

describe('RequestCampaignGeneration', () => {
  it('captures current commercial data when requesting generation, not when creating the draft', async () => {
    const context = await setup();
    context.lookups.data.product.name = 'Nombre actualizado';
    context.lookups.data.product.regularPrice.amountMinor = 3000;
    context.clock.value = LATER;
    const result = await context.generate.execute(context.selection);
    expect(result).toMatchObject({
      status: CampaignStatus.GENERATING,
      version: 1,
      updatedAt: LATER,
    });
    expect(result.generation).toMatchObject({
      id: GENERATION,
      number: 1,
      requestedAt: LATER,
      snapshot: { product: { name: 'Nombre actualizado', regularPrice: { amountMinor: 3000 } } },
    });
    Object.assign(result.generation!.snapshot.product, { name: 'Modified DTO' });
    context.lookups.data.product.name = 'Modified source';
    expect(context.repository.records.get(CAMPAIGN)!.generation!.snapshot.data.product.name).toBe(
      'Nombre actualizado',
    );
  });

  it('rejects a second active generation without replacing its operation', async () => {
    const context = await setup('generating');
    const original = context.repository.records.get(CAMPAIGN);
    await expect(context.generate.execute(context.selection)).rejects.toThrow(
      InvalidCampaignTransitionError,
    );
    expect(context.repository.records.get(CAMPAIGN)).toBe(original);
  });

  it('revalidates resource existence and the promotional price before leaving draft', async () => {
    const context = await setup();
    context.lookups.data.product.regularPrice.amountMinor = 1000;
    await expect(context.generate.execute(context.selection)).rejects.toThrow(
      InvalidPromotionError,
    );
    context.lookups.products.findById = () => Promise.resolve(null);
    await expect(context.generate.execute(context.selection)).rejects.toThrow(
      CampaignResourceNotFoundError,
    );
    expect(context.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.DRAFT);
    expect(context.repository.generations.size).toBe(0);
  });
});

describe('RecordGeneratedCampaign', () => {
  it('accepts a complete result with the captured input even if live resources change or disappear', async () => {
    const context = await setup('generating');
    context.lookups.data.product.regularPrice.amountMinor = 9999;
    context.lookups.products.findById = () => Promise.resolve(null);
    context.clock.value = LATER;
    const result = await context.record.execute({
      ...context.selection,
      generationId: GENERATION,
      content: payloadFixture(),
    });
    expect(result.status).toBe(CampaignStatus.PENDING_APPROVAL);
    expect(result.candidateContent).toMatchObject({
      id: CONTENT,
      generationId: GENERATION,
      revision: 1,
      createdAt: LATER,
      snapshot: { product: { regularPrice: { amountMinor: 2000 } } },
    });
    result.candidateContent!.assetIds.length = 0;
    Object.assign(result.candidateContent!.snapshot.organization, { name: 'Changed DTO' });
    expect(context.repository.contents.get(CONTENT)!.assetIds).toHaveLength(1);
    expect(context.repository.contents.get(CONTENT)!.snapshot.data.organization.name).toBe(
      'Empresa',
    );
  });

  it.each(['pending', 'approved'] as const)(
    'handles an identical callback in %s without saving or changing approval',
    async (state) => {
      const context = await setup(state);
      const original = context.repository.records.get(CAMPAIGN)!;
      const writes = context.repository.saveCount;
      context.clock.value = LATER;
      const result = await context.record.execute({
        ...context.selection,
        generationId: GENERATION,
        content: payloadFixture(),
      });
      expect(result.status).toBe(original.status);
      expect(result.approvedContentId).toBe(original.approvedContentId);
      expect(result.candidateContent!.createdAt).toBe(NOW);
      expect(result.version).toBe(original.version);
      expect(context.repository.saveCount).toBe(writes);
      expect(context.repository.contents.size).toBe(1);
    },
  );

  it('rejects incomplete output, contradictory results and stale callbacks without saving them', async () => {
    const context = await setup('generating');
    await expect(
      context.record.execute({
        ...context.selection,
        generationId: GENERATION,
        content: { ...payloadFixture(), assetIds: [] },
      }),
    ).rejects.toThrow(IncompleteGeneratedContentError);
    expect(context.repository.contents.size).toBe(0);
    expect(context.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.GENERATING);
    await context.record.execute({
      ...context.selection,
      generationId: GENERATION,
      content: payloadFixture(),
    });
    await expect(
      context.record.execute({
        ...context.selection,
        generationId: GENERATION,
        content: { ...payloadFixture(), caption: 'Conflicting output' },
      }),
    ).rejects.toThrow(ConflictingGenerationResultError);
    await context.regenerate.execute(context.selection);
    await expect(
      context.record.execute({
        ...context.selection,
        generationId: GENERATION,
        content: payloadFixture(),
      }),
    ).rejects.toThrow(StaleGenerationResultError);
    expect(context.repository.contents.size).toBe(1);
    expect([...context.repository.contents.values()][0]!.caption).toBe(payloadFixture().caption);
    expect(context.repository.records.get(CAMPAIGN)!.candidateContent).toBeNull();
  });

  it('propagates an atomic write failure while preserving the generation for a retry', async () => {
    const context = await setup('generating');
    const original = context.repository.records.get(CAMPAIGN);
    const failure = new Error('Storage unavailable');
    context.repository.save = () => Promise.reject(failure);
    await expect(
      context.record.execute({
        ...context.selection,
        generationId: GENERATION,
        content: payloadFixture(),
      }),
    ).rejects.toBe(failure);
    expect(context.repository.records.get(CAMPAIGN)).toBe(original);
    expect(context.repository.contents.size).toBe(0);
  });
});

describe('ApproveCampaign', () => {
  it('requires the candidate ID the user actually reviewed', async () => {
    const context = await setup('pending');
    await expect(
      context.approve.execute({ ...context.selection, contentId: testId(500) }),
    ).rejects.toThrow(ContentRevisionMismatchError);
    expect(context.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.PENDING_APPROVAL);
    const approved = await context.approve.execute({ ...context.selection, contentId: CONTENT });
    expect(approved.approvedContentId).toBe(CONTENT);
    expect(approved.status).toBe(CampaignStatus.APPROVED);
  });

  it('rejects approval when the captured promotion has expired', async () => {
    const context = await setup('pending');
    context.clock.value = EXPIRES;
    await expect(
      context.approve.execute({ ...context.selection, contentId: CONTENT }),
    ).rejects.toThrow(PromotionExpiredError);
    expect(context.repository.records.get(CAMPAIGN)!.approvedContentId).toBeNull();
  });

  it('surfaces concurrent modification instead of silently replacing an approval', async () => {
    const context = await setup('pending');
    const snapshot = context.repository.records.get(CAMPAIGN)!;
    context.repository.findById = () => Promise.resolve(snapshot);
    const results = await Promise.allSettled([
      context.approve.execute({ ...context.selection, contentId: CONTENT }),
      context.approve.execute({ ...context.selection, contentId: CONTENT }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.reason).toBeInstanceOf(ConcurrentCampaignModificationError);
    expect(context.repository.records.get(CAMPAIGN)!.version).toBe(snapshot.version + 1);
  });
});

describe('RequestCampaignRegeneration', () => {
  it('invalidates approval, retains history and creates a new reviewable revision using current inputs', async () => {
    const context = await setup('approved');
    const original = context.repository.contents.get(CONTENT)!;
    context.lookups.data.product.regularPrice.amountMinor = 4000;
    context.clock.value = LATER;
    const result = await context.regenerate.execute(context.selection);
    expect(result).toMatchObject({
      status: CampaignStatus.GENERATING,
      approvedContentId: null,
      candidateContent: null,
      generation: { number: 2 },
    });
    expect(result.generation!.id).not.toBe(GENERATION);
    expect(result.generation!.snapshot.product.regularPrice.amountMinor).toBe(4000);
    expect(result.templateRevisionId).toBe(original.snapshot.data.template.revisionId);
    expect(context.repository.contents.get(CONTENT)).toBe(original);
    expect(original.snapshot.data.product.regularPrice.amountMinor).toBe(2000);
    const next = await context.record.execute({
      ...context.selection,
      generationId: result.generation!.id,
      content: payloadFixture(),
    });
    expect(next.candidateContent!.revision).toBe(2);
    expect(next.candidateContent!.id).not.toBe(CONTENT);
    await expect(
      context.approve.execute({ ...context.selection, contentId: CONTENT }),
    ).rejects.toThrow(ContentRevisionMismatchError);
    const approved = await context.approve.execute({
      ...context.selection,
      contentId: next.candidateContent!.id,
    });
    expect(approved.approvedContentId).toBe(next.candidateContent!.id);
    expect(context.repository.contents.size).toBe(2);
    expect(context.repository.generations.size).toBe(2);
  });

  it('preserves the previous approval if regeneration cannot be stored', async () => {
    const context = await setup('approved');
    const original = context.repository.records.get(CAMPAIGN);
    const failure = new Error('Storage unavailable');
    context.repository.save = () => Promise.reject(failure);
    await expect(context.regenerate.execute(context.selection)).rejects.toBe(failure);
    expect(context.repository.records.get(CAMPAIGN)).toBe(original);
    expect(context.repository.records.get(CAMPAIGN)!.approvedContentId).toBe(CONTENT);
    expect(context.repository.generations.size).toBe(1);
  });
});

describe('RecordCampaignGenerationFailure', () => {
  it('records a safe failure code once, retries with another operation and rejects late failure callbacks', async () => {
    const context = await setup('generating');
    const failure = {
      ...context.selection,
      generationId: GENERATION,
      code: GenerationFailureCode.TIMEOUT,
    };
    const failed = await context.fail.execute(failure);
    expect(failed).toMatchObject({
      status: CampaignStatus.FAILED,
      generationFailure: GenerationFailureCode.TIMEOUT,
    });
    const writes = context.repository.saveCount;
    expect((await context.fail.execute(failure)).version).toBe(failed.version);
    expect(context.repository.saveCount).toBe(writes);
    const retried = await context.generate.execute(context.selection);
    expect(retried.generation!.number).toBe(2);
    expect(retried.generationFailure).toBeNull();
    await expect(context.fail.execute(failure)).rejects.toThrow(StaleGenerationResultError);
    expect(context.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.GENERATING);
  });
});

describe('Campaign application isolation', () => {
  it.each(['generate', 'regenerate', 'record', 'approve', 'fail'] as const)(
    'scopes %s to the organization and checks repository results defensively',
    async (action) => {
      const context = await setup('pending');
      const input = {
        ...context.selection,
        organizationId: OTHER_ORG,
        contentId: CONTENT,
        generationId: GENERATION,
        content: payloadFixture(),
        code: GenerationFailureCode.TIMEOUT,
      };
      const writes = context.repository.saveCount;
      await expect(context[action].execute(input)).rejects.toThrow(CampaignNotFoundError);
      context.repository.findById = () => Promise.resolve(domainFixture().pending);
      await expect(context[action].execute(input)).rejects.toThrow(CampaignNotFoundError);
      expect(context.repository.saveCount).toBe(writes);
    },
  );

  it('does not lose a concurrent generation request under the repository version contract', async () => {
    const context = await setup();
    const snapshot = context.repository.records.get(CAMPAIGN)!;
    context.repository.findById = () => Promise.resolve(snapshot);
    const results = await Promise.allSettled([
      context.generate.execute(context.selection),
      context.generate.execute(context.selection),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')?.reason).toBeInstanceOf(
      ConcurrentCampaignModificationError,
    );
    expect(context.repository.generations.size).toBe(1);
  });
});
