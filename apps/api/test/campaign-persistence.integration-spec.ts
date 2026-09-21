import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG, readDatabaseConfig } from '#app/config/database.config';
import { CLOCK } from '#app/infrastructure/runtime.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import {
  PersistenceConflictError,
  PersistenceReferenceError,
  PersistenceScopeError,
} from '#app/infrastructure/persistence/persistence.errors';
import { entityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import { CreateOrganization } from '#app/modules/organizations/application/use-cases/create-organization';
import { UpdateOrganizationProfile } from '#app/modules/organizations/application/use-cases/update-organization-profile';
import { CreateProduct } from '#app/modules/products/application/use-cases/create-product';
import { UpdateProduct } from '#app/modules/products/application/use-cases/update-product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { CreateTemplate } from '#app/modules/templates/application/use-cases/create-template';
import { Campaign } from '#app/modules/campaigns/domain/entities/campaign';
import { GeneratedContent } from '#app/modules/campaigns/domain/entities/generated-content';
import { GenerationSnapshot } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import {
  CampaignStatus,
  GenerationFailureCode,
} from '#app/modules/campaigns/domain/campaign-status';
import {
  ConcurrentCampaignModificationError,
  StaleGenerationResultError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { RequestCampaignRegeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-regeneration';
import { RecordGeneratedCampaign } from '#app/modules/campaigns/application/use-cases/record-generated-campaign';
import { RecordCampaignGenerationFailure } from '#app/modules/campaigns/application/use-cases/record-campaign-generation-failure';
import { ApproveCampaign } from '#app/modules/campaigns/application/use-cases/approve-campaign';
import { CampaignResourceNotFoundError } from '#app/modules/campaigns/application/errors/campaign-resource-not-found.error';
import { campaignResult } from '#app/modules/campaigns/application/campaign-result';
import { loadCampaignResources } from '#app/modules/campaigns/application/load-campaign-resources';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaCampaignLookups } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-lookups';
import {
  CampaignMapper,
  campaignRelations,
} from '#app/modules/campaigns/infrastructure/persistence/prisma/campaign.mapper';
import { campaignState } from './support/campaign-restoration.js';

const NOW = new Date('2026-09-20T12:00:00.000Z');
const LATER = new Date('2026-09-20T13:00:00.000Z');
const uuid = () => entityId(randomUUID());
const payload = () => ({
  headline: 'Oferta',
  caption: 'Descripción',
  cta: 'Comprar',
  hashtags: ['#oferta'],
  assetIds: [uuid()],
});

describe('Campaign persistence (PostgreSQL)', () => {
  let module: TestingModule;
  let database: PrismaService;
  let campaigns: PrismaCampaignRepository;
  let lookups: PrismaCampaignLookups;
  const clock = {
    value: NOW,
    now() {
      return new Date(this.value);
    },
  };

  beforeAll(async () => {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa pnpm test:integration para crear el esquema aislado.');
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    await module.init();
    database = module.get(PrismaService);
    campaigns = module.get(PrismaCampaignRepository);
    lookups = module.get(PrismaCampaignLookups);
  });
  beforeEach(() => {
    clock.value = NOW;
  });
  afterAll(async () => {
    await module?.close();
  });

  async function fixture() {
    const organization = await module
      .get(CreateOrganization)
      .execute({ name: 'Empresa', brandTone: 'Cercano' });
    const organizationId = entityId(organization.id);
    const product = await module.get(CreateProduct).execute({
      organizationId,
      kind: ProductKind.SERVICE,
      name: 'Servicio',
      regularPrice: { amountMinor: 2000, currency: 'PEN' },
      imageAssetIds: [uuid()],
    });
    const template = await module
      .get(CreateTemplate)
      .execute({ organizationId, name: 'Plantilla', dimensions: { width: 1080, height: 1080 } });
    const input = {
      organizationId,
      productId: entityId(product.id),
      templateId: entityId(template.id),
      templateRevisionId: entityId(template.currentRevision.id),
      title: 'Campaña',
      instructions: 'Texto exacto',
      cta: 'Comprar',
      promotion: {
        amountMinor: 1500,
        currency: 'PEN',
        endsAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    };
    const result = await module.get(CreateCampaign).execute(input);
    const selection = { organizationId, campaignId: entityId(result.id) };
    return {
      input,
      selection,
      draft: (await campaigns.findById(organizationId, selection.campaignId))!,
    };
  }
  async function generating() {
    const context = await fixture();
    const result = await module.get(RequestCampaignGeneration).execute(context.selection);
    return {
      ...context,
      generationId: result.generation!.id,
      campaign: (await campaigns.findById(
        context.selection.organizationId,
        context.selection.campaignId,
      ))!,
    };
  }
  async function pending() {
    const context = await generating();
    const content = payload();
    const result = await module
      .get(RecordGeneratedCampaign)
      .execute({ ...context.selection, generationId: context.generationId, content });
    return {
      ...context,
      content,
      result,
      campaign: (await campaigns.findById(
        context.selection.organizationId,
        context.selection.campaignId,
      ))!,
    };
  }
  async function snapshot(campaign: Campaign) {
    return GenerationSnapshot.capture(
      await loadCampaignResources(campaign, lookups),
      campaign.instructions,
      campaign.cta,
      campaign.promotion,
    );
  }
  function generated(campaign: Campaign, id = uuid()) {
    return GeneratedContent.create(
      {
        id,
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        generationId: campaign.generation!.id,
        revision: campaign.generation!.number,
      },
      campaign.generation!.snapshot,
      payload(),
      clock.now(),
    );
  }

  it('runs create, generation, result and approval through Nest and reloads their exact values', async () => {
    const context = await pending();
    expect(campaignResult(context.campaign)).toEqual(context.result);
    clock.value = LATER;
    const approved = await module
      .get(ApproveCampaign)
      .execute({ ...context.selection, contentId: context.result.candidateContent!.id });
    const loaded = (await campaigns.findById(context.draft.organizationId, context.draft.id))!;
    expect(campaignResult(loaded)).toEqual(approved);
    expect(loaded.version).toBe(3);
    expect(loaded.createdAt).toEqual(NOW);
    expect(loaded.updatedAt).toEqual(LATER);
    expect(loaded.candidateContent!.createdAt).toEqual(NOW);
  });

  it('keeps duplicate callbacks idempotent after loading persisted state', async () => {
    const context = await pending();
    clock.value = LATER;
    const duplicate = await module.get(RecordGeneratedCampaign).execute({
      ...context.selection,
      generationId: context.generationId,
      content: context.content,
    });
    expect(duplicate).toEqual(context.result);
    expect(await database.generatedContent.count({ where: { campaignId: context.draft.id } })).toBe(
      1,
    );
  });

  it('keeps approved snapshots and old content when commercial values change and regeneration starts', async () => {
    const context = await pending();
    await module
      .get(ApproveCampaign)
      .execute({ ...context.selection, contentId: context.result.candidateContent!.id });
    clock.value = LATER;
    await module
      .get(UpdateOrganizationProfile)
      .execute({ organizationId: context.input.organizationId, name: 'Empresa nueva' });
    await module.get(UpdateProduct).execute({
      organizationId: context.input.organizationId,
      productId: context.input.productId,
      regularPrice: { amountMinor: 3000, currency: 'PEN' },
    });
    const approved = (await campaigns.findById(context.draft.organizationId, context.draft.id))!;
    expect(approved.candidateContent!.snapshot.data.product.regularPrice.amountMinor).toBe(2000);
    expect(approved.candidateContent!.snapshot.data.organization.name).toBe('Empresa');
    const result = await module.get(RequestCampaignRegeneration).execute(context.selection);
    expect(result).toMatchObject({
      status: CampaignStatus.GENERATING,
      candidateContent: null,
      approvedContentId: null,
    });
    expect(result.generation!.number).toBe(2);
    expect(result.generation!.snapshot.product.regularPrice.amountMinor).toBe(3000);
    const history = await database.campaignGeneration.findMany({
      where: { campaignId: context.draft.id },
      orderBy: { number: 'asc' },
    });
    expect(history).toHaveLength(2);
    expect(history[0]!.snapshot).toEqual(context.result.generation!.snapshot);
    expect(await database.generatedContent.count({ where: { campaignId: context.draft.id } })).toBe(
      1,
    );
    await expect(
      module.get(RecordGeneratedCampaign).execute({
        ...context.selection,
        generationId: context.generationId,
        content: context.content,
      }),
    ).rejects.toThrow(StaleGenerationResultError);
  });

  it('looks up the pinned template revision even if another revision becomes current', async () => {
    const context = await fixture();
    await database.$transaction(async (tx) => {
      const next = uuid();
      await tx.templateRevision.create({
        data: {
          id: next,
          organizationId: context.input.organizationId,
          templateId: context.input.templateId,
          number: 2,
          width: 1080,
          height: 1080,
          createdAt: LATER,
        },
      });
      await tx.template.update({
        where: { id: context.input.templateId },
        data: { currentRevisionId: next, updatedAt: LATER },
      });
    });
    const result = await module.get(RequestCampaignGeneration).execute(context.selection);
    expect(result.generation!.snapshot.template.revisionId).toBe(context.input.templateRevisionId);
    expect(result.generation!.snapshot.template.revisionNumber).toBe(1);
  });

  it('preserves failed generations and their immutable error code across retries', async () => {
    const context = await generating();
    const input = {
      ...context.selection,
      generationId: context.generationId,
      code: GenerationFailureCode.TIMEOUT,
    };
    const failed = await module.get(RecordCampaignGenerationFailure).execute(input);
    clock.value = LATER;
    expect(await module.get(RecordCampaignGenerationFailure).execute(input)).toEqual(failed);
    const retried = await module.get(RequestCampaignGeneration).execute(context.selection);
    expect(retried.generation!.number).toBe(2);
    expect(retried.generationFailure).toBeNull();
    expect(
      await database.campaignGenerationFailure.findUnique({
        where: { generationId: context.generationId },
      }),
    ).toMatchObject({ code: GenerationFailureCode.TIMEOUT, recordedAt: NOW });
    expect(
      await database.campaignGeneration.count({ where: { campaignId: context.draft.id } }),
    ).toBe(2);
  });

  it('lets exactly one concurrent generation write win and rolls back the losing history', async () => {
    const { draft } = await fixture();
    const data = await snapshot(draft);
    const first = draft.requestGeneration(uuid(), data, NOW);
    const second = draft.requestGeneration(uuid(), data, NOW);
    const results = await Promise.allSettled([
      campaigns.save(draft.organizationId, first, 0),
      campaigns.save(draft.organizationId, second, 0),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')?.reason).toBeInstanceOf(
      ConcurrentCampaignModificationError,
    );
    expect(await database.campaignGeneration.count({ where: { campaignId: draft.id } })).toBe(1);
    expect((await campaigns.findById(draft.organizationId, draft.id))!.version).toBe(1);
  });

  it('accepts only one of two concurrent different results for the same generation', async () => {
    const { campaign } = await generating();
    const first = campaign.recordGeneratedContent(generated(campaign), NOW);
    const second = campaign.recordGeneratedContent(generated(campaign), NOW);
    const results = await Promise.allSettled([
      campaigns.save(campaign.organizationId, first, 1),
      campaigns.save(campaign.organizationId, second, 1),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')?.reason).toBeInstanceOf(
      ConcurrentCampaignModificationError,
    );
    expect(await database.generatedContent.count({ where: { campaignId: campaign.id } })).toBe(1);
  });

  it('enforces insert-only identity and never upserts a missing campaign', async () => {
    const { draft } = await fixture();
    await expect(campaigns.add(draft.organizationId, draft)).rejects.toThrow(
      PersistenceConflictError,
    );
    const missing = Campaign.create(uuid(), { ...campaignState(draft) }, NOW);
    const next = missing.requestGeneration(uuid(), await snapshot(missing), NOW);
    await expect(campaigns.save(missing.organizationId, next, 0)).rejects.toThrow(
      ConcurrentCampaignModificationError,
    );
    expect(await campaigns.findById(missing.organizationId, missing.id)).toBeNull();
  });

  it('scopes reads, writes and every commercial lookup to its organization', async () => {
    const { draft, input } = await fixture();
    const other = await fixture();
    expect(await campaigns.findById(other.draft.organizationId, draft.id)).toBeNull();
    await expect(campaigns.add(other.draft.organizationId, draft)).rejects.toThrow(
      PersistenceScopeError,
    );
    await expect(campaigns.save(other.draft.organizationId, draft, 0)).rejects.toThrow(
      PersistenceScopeError,
    );
    expect(await lookups.products.findById(other.draft.organizationId, draft.productId)).toBeNull();
    expect(
      await lookups.templates.findRevision(
        other.draft.organizationId,
        draft.templateId,
        draft.templateRevisionId,
      ),
    ).toBeNull();
    for (const change of [
      { organizationId: uuid() },
      { productId: other.draft.productId },
      { templateRevisionId: other.draft.templateRevisionId },
    ]) {
      await expect(module.get(CreateCampaign).execute({ ...input, ...change })).rejects.toThrow(
        CampaignResourceNotFoundError,
      );
    }
    const wrong = Campaign.create(
      uuid(),
      { ...input, promotion: null, productId: other.draft.productId },
      NOW,
    );
    await expect(campaigns.add(draft.organizationId, wrong)).rejects.toThrow(
      PersistenceReferenceError,
    );
  });

  it('rolls back the root update when a new generation reuses an existing global ID', async () => {
    const first = await generating();
    const { draft } = await fixture();
    const next = draft.requestGeneration(first.generationId, await snapshot(draft), NOW);
    await expect(campaigns.save(draft.organizationId, next, 0)).rejects.toThrow(
      PersistenceConflictError,
    );
    expect((await campaigns.findById(draft.organizationId, draft.id))!.status).toBe(
      CampaignStatus.DRAFT,
    );
    expect(await database.campaignGeneration.count({ where: { campaignId: draft.id } })).toBe(0);
  });

  it('rolls back the root and preserves existing content on a content ID collision', async () => {
    const first = await pending();
    const { campaign } = await generating();
    const next = campaign.recordGeneratedContent(
      generated(campaign, entityId(first.result.candidateContent!.id)),
      NOW,
    );
    await expect(campaigns.save(campaign.organizationId, next, 1)).rejects.toThrow(
      PersistenceConflictError,
    );
    expect((await campaigns.findById(campaign.organizationId, campaign.id))!.status).toBe(
      CampaignStatus.GENERATING,
    );
    expect(await database.generatedContent.count({ where: { campaignId: campaign.id } })).toBe(0);
    expect(
      campaignResult((await campaigns.findById(first.draft.organizationId, first.draft.id))!),
    ).toEqual(first.result);
  });

  it('rejects replacement of the persisted snapshot or content through a restored aggregate', async () => {
    const { campaign } = await pending();
    const resources = await loadCampaignResources(campaign, lookups);
    resources.organization.name = 'Historia alterada';
    const forgedSnapshot = GenerationSnapshot.capture(
      resources,
      campaign.instructions,
      campaign.cta,
      campaign.promotion,
    );
    const content = GeneratedContent.create(
      { ...campaign.candidateContent! },
      forgedSnapshot,
      campaign.candidateContent!,
      NOW,
    );
    const forged = Campaign.restore({
      ...campaignState(campaign),
      generation: { ...campaign.generation!, snapshot: forgedSnapshot },
      candidateContent: content,
      version: campaign.version + 1,
    });
    await expect(campaigns.save(campaign.organizationId, forged, campaign.version)).rejects.toThrow(
      PersistenceConflictError,
    );
    const changed = GeneratedContent.create(
      { ...campaign.candidateContent! },
      campaign.generation!.snapshot,
      { ...campaign.candidateContent!, headline: 'Reescrito' },
      NOW,
    );
    const rewritten = Campaign.restore({
      ...campaignState(campaign),
      candidateContent: changed,
      version: campaign.version + 1,
    });
    await expect(
      campaigns.save(campaign.organizationId, rewritten, campaign.version),
    ).rejects.toThrow(PersistenceConflictError);
    expect((await campaigns.findById(campaign.organizationId, campaign.id))!.version).toBe(
      campaign.version,
    );
  });

  it('prevents SQL from rewriting or deleting generations, contents and failure history', async () => {
    const first = await pending();
    await module.get(RequestCampaignRegeneration).execute(first.selection);
    await expect(
      database.campaignGeneration.update({
        where: { id: first.generationId },
        data: { snapshot: {} },
      }),
    ).rejects.toThrow();
    await expect(
      database.campaignGeneration.delete({ where: { id: first.generationId } }),
    ).rejects.toThrow();
    await expect(
      database.generatedContent.update({
        where: { id: first.result.candidateContent!.id },
        data: { headline: 'Alterado' },
      }),
    ).rejects.toThrow();
    await expect(
      database.generatedContent.delete({ where: { id: first.result.candidateContent!.id } }),
    ).rejects.toThrow();
    const failure = await generating();
    await module.get(RecordCampaignGenerationFailure).execute({
      ...failure.selection,
      generationId: failure.generationId,
      code: GenerationFailureCode.TIMEOUT,
    });
    await expect(
      database.campaignGenerationFailure.update({
        where: { generationId: failure.generationId },
        data: { code: GenerationFailureCode.INVALID_OUTPUT },
      }),
    ).rejects.toThrow();
    await expect(
      database.campaignGenerationFailure.delete({ where: { generationId: failure.generationId } }),
    ).rejects.toThrow();
  });

  it('enforces one content per generation, unique generation numbers and correct content references in SQL', async () => {
    const first = await pending();
    const second = await pending();
    await expect(
      database.campaignGeneration.create({
        data: {
          ...CampaignMapper.generation(first.campaign, first.campaign.generation!),
          id: uuid(),
          snapshot: first.campaign.generation!.snapshot.data,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      database.generatedContent.create({
        data: { ...CampaignMapper.content(first.campaign.candidateContent!), id: uuid() },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      database.campaign.update({
        where: { id: first.draft.id },
        data: { candidateContentId: second.result.candidateContent!.id },
      }),
    ).rejects.toThrow();
    await expect(
      database.campaign.update({
        where: { id: first.draft.id },
        data: { approvedContentId: second.result.candidateContent!.id },
      }),
    ).rejects.toThrow();
    await expect(
      database.campaign.update({
        where: { id: first.draft.id },
        data: { currentGenerationId: second.generationId },
      }),
    ).rejects.toThrow();
  });

  it('persists publication summaries without adding publication persistence or sending anything', async () => {
    const context = await pending();
    const account = uuid();
    let previous = context.campaign;
    let next = previous.approve(previous.candidateContent!.id, NOW, [account]);
    await campaigns.save(next.organizationId, next, previous.version);
    const entries = [
      {
        publicationId: uuid(),
        organizationId: next.organizationId,
        campaignId: next.id,
        approvedContentId: next.approvedContentId!,
        socialAccountId: account,
        status: PublicationStatus.PENDING,
        version: 0,
      },
    ];
    previous = (await campaigns.findById(next.organizationId, next.id))!;
    next = previous.startPublication(entries, NOW);
    await campaigns.save(next.organizationId, next, previous.version);
    previous = (await campaigns.findById(next.organizationId, next.id))!;
    next = previous.recordPublicationSummary(
      entries.map((entry) => ({ ...entry, status: PublicationStatus.PUBLISHED, version: 2 })),
      LATER,
    );
    await campaigns.save(next.organizationId, next, previous.version);
    expect(campaignResult((await campaigns.findById(next.organizationId, next.id))!)).toEqual(
      campaignResult(next),
    );
  });

  it('rejects corrupt stored state rather than returning a partially validated aggregate', async () => {
    const context = await pending();
    const row = await database.campaign.findUniqueOrThrow({
      where: { id: context.draft.id },
      include: campaignRelations,
    });
    expect(() => CampaignMapper.toDomain({ ...row, version: 9007199254740992n })).toThrow();
    expect(() => CampaignMapper.toDomain({ ...row, currentGeneration: null })).toThrow();
    expect(() => CampaignMapper.toDomain({ ...row, candidateContentId: uuid() })).toThrow();
  });

  it('rejects stale versions after a winner commits and refuses invalid version increments', async () => {
    const { draft } = await fixture();
    const data = await snapshot(draft);
    const winner = draft.requestGeneration(uuid(), data, NOW);
    await campaigns.save(draft.organizationId, winner, 0);
    await expect(
      campaigns.save(draft.organizationId, draft.requestGeneration(uuid(), data, NOW), 0),
    ).rejects.toThrow(ConcurrentCampaignModificationError);
    for (const version of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, 1]) {
      await expect(campaigns.save(draft.organizationId, winner, version)).rejects.toThrow();
    }
    expect((await campaigns.findById(draft.organizationId, draft.id))!.generation!.id).toBe(
      winner.generation!.id,
    );
  });

  it('does not overwrite another owner even with a forged aggregate using the same campaign ID', async () => {
    const owner = await fixture();
    const other = await fixture();
    const forged = Campaign.create(
      owner.draft.id,
      { ...other.input, promotion: other.draft.promotion },
      NOW,
    );
    const next = forged.requestGeneration(uuid(), await snapshot(forged), NOW);
    await expect(campaigns.save(other.draft.organizationId, next, 0)).rejects.toThrow(
      ConcurrentCampaignModificationError,
    );
    expect(
      campaignResult((await campaigns.findById(owner.draft.organizationId, owner.draft.id))!),
    ).toEqual(campaignResult(owner.draft));
  });

  it('rejects reuse of an older generation ID from the same campaign after another retry', async () => {
    const context = await generating();
    await module.get(RecordCampaignGenerationFailure).execute({
      ...context.selection,
      generationId: context.generationId,
      code: GenerationFailureCode.TIMEOUT,
    });
    const second = await module.get(RequestCampaignGeneration).execute(context.selection);
    await module.get(RecordCampaignGenerationFailure).execute({
      ...context.selection,
      generationId: second.generation!.id,
      code: GenerationFailureCode.TIMEOUT,
    });
    const failed = (await campaigns.findById(context.draft.organizationId, context.draft.id))!;
    const reused = failed.requestGeneration(context.generationId, await snapshot(failed), NOW);
    await expect(campaigns.save(failed.organizationId, reused, failed.version)).rejects.toThrow(
      PersistenceConflictError,
    );
    expect((await campaigns.findById(failed.organizationId, failed.id))!.generation!.number).toBe(
      2,
    );
    expect(await database.campaignGeneration.count({ where: { campaignId: failed.id } })).toBe(2);
  });

  it('rejects inconsistent statuses and unsafe versions at the SQL boundary', async () => {
    const context = await generating();
    for (const data of [
      { status: CampaignStatus.FAILED, failureOrigin: null, generationFailure: null },
      { status: CampaignStatus.APPROVED, approvedContentId: null },
      { status: CampaignStatus.PENDING_APPROVAL, candidateContentId: null },
      { version: -1n },
      { version: 9007199254740992n },
    ]) {
      await expect(
        database.campaign.update({ where: { id: context.draft.id }, data }),
      ).rejects.toThrow();
    }
    expect((await campaigns.findById(context.draft.organizationId, context.draft.id))!.status).toBe(
      CampaignStatus.GENERATING,
    );
  });

  it('round-trips large safe-integer money in immutable JSON snapshots', async () => {
    const context = await fixture();
    await module.get(UpdateProduct).execute({
      organizationId: context.input.organizationId,
      productId: context.input.productId,
      regularPrice: { amountMinor: Number.MAX_SAFE_INTEGER, currency: 'PEN' },
    });
    await module.get(RequestCampaignGeneration).execute(context.selection);
    const loaded = (await campaigns.findById(context.draft.organizationId, context.draft.id))!;
    expect(loaded.generation!.snapshot.data.product.regularPrice.amountMinor).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    clock.value = new Date('2030-01-01T00:00:00.000Z');
    expect(
      (await campaigns.findById(context.draft.organizationId, context.draft.id))!.promotion!.price
        .amountMinor,
    ).toBe(1500);
  });
});
