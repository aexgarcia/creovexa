import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG, readDatabaseConfig } from '#app/config/database.config';
import { CLOCK } from '#app/infrastructure/runtime.module';
import {
  PUBLICATION_TRANSACTION,
  type PublicationTransaction,
} from '#app/application/ports/publication-transaction';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import {
  PersistenceConflictError,
  PersistenceReferenceError,
  PersistenceScopeError,
} from '#app/infrastructure/persistence/persistence.errors';
import { entityId } from '#app/domain/entity-id';
import { PublicationStatus } from '#app/domain/publication-status';
import {
  Publication,
  PublicationFailureCode,
} from '#app/modules/publications/domain/entities/publication';
import { SocialPlatform } from '#app/modules/publications/domain/social-platform';
import {
  ConcurrentPublicationModificationError,
  StalePublicationAttemptError,
  ConflictingPublicationResultError,
} from '#app/modules/publications/domain/errors/publication.errors';
import { PrismaPublicationRepository } from '#app/modules/publications/infrastructure/persistence/prisma/prisma-publication.repository';
import { PublicationMapper } from '#app/modules/publications/infrastructure/persistence/prisma/publication.mapper';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
import type { Campaign } from '#app/modules/campaigns/domain/entities/campaign';
import { ConcurrentCampaignModificationError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { CreateOrganization } from '#app/modules/organizations/application/use-cases/create-organization';
import { CreateProduct } from '#app/modules/products/application/use-cases/create-product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { CreateTemplate } from '#app/modules/templates/application/use-cases/create-template';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { RecordGeneratedCampaign } from '#app/modules/campaigns/application/use-cases/record-generated-campaign';
import { publicationState } from './support/publication-restoration.js';
import { summary } from './support/publication-fixtures.js';

const NOW = new Date('2026-09-21T12:00:00.000Z');
const LATER = new Date('2026-09-21T13:00:00.000Z');
const uuid = () => entityId(randomUUID());
interface Context {
  campaign: Campaign;
  publications: Publication[];
}

describe('Publication persistence (PostgreSQL)', () => {
  let module: TestingModule;
  let database: PrismaService;
  let campaigns: PrismaCampaignRepository;
  let publications: PrismaPublicationRepository;
  let transaction: PublicationTransaction;
  beforeAll(async () => {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa pnpm test:integration para crear el esquema aislado.');
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(NOW) })
      .compile();
    await module.init();
    database = module.get(PrismaService);
    campaigns = module.get(PrismaCampaignRepository);
    publications = module.get(PrismaPublicationRepository);
    transaction = module.get(PUBLICATION_TRANSACTION);
  });
  afterAll(async () => {
    await module?.close();
  });

  it('stops the migration when legacy summaries cannot be backed by publication history', async () => {
    const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL search_path TO pg_temp');
      await client.query('CREATE TEMP TABLE campaigns (publication_progress JSONB) ON COMMIT DROP');
      await client.query('INSERT INTO campaigns VALUES ($1::jsonb)', ['[]']);
      const migration = await readFile(
        new URL('../prisma/migrations/20260921000100_publications/migration.sql', import.meta.url),
        'utf8',
      );
      await expect(client.query(migration)).rejects.toMatchObject({
        code: '23514',
        message: 'Reconcile existing publication summaries before applying this migration.',
      });
    } finally {
      try {
        await client.query('ROLLBACK');
      } finally {
        await client.end();
      }
    }
  });

  async function approved(): Promise<Context> {
    const organization = await module.get(CreateOrganization).execute({ name: 'Empresa' });
    const organizationId = entityId(organization.id);
    const product = await module.get(CreateProduct).execute({
      organizationId,
      kind: ProductKind.PRODUCT,
      name: 'Producto',
      regularPrice: { amountMinor: 1000, currency: 'PEN' },
    });
    const template = await module.get(CreateTemplate).execute({
      organizationId,
      name: 'Plantilla',
      dimensions: { width: 1080, height: 1080 },
    });
    const created = await module.get(CreateCampaign).execute({
      organizationId,
      productId: product.id,
      templateId: template.id,
      templateRevisionId: template.currentRevision.id,
      title: 'Campaña',
      cta: 'Comprar',
    });
    const selection = { organizationId, campaignId: entityId(created.id) };
    const generating = await module.get(RequestCampaignGeneration).execute(selection);
    await module.get(RecordGeneratedCampaign).execute({
      ...selection,
      generationId: generating.generation!.id,
      content: {
        headline: 'Oferta',
        caption: 'Descripción',
        cta: 'Comprar',
        hashtags: ['#oferta'],
        assetIds: [uuid()],
      },
    });
    const pending = (await campaigns.findById(organizationId, selection.campaignId))!;
    const accounts = [uuid(), uuid()];
    const campaign = pending.approve(pending.candidateContent!.id, NOW, accounts);
    await campaigns.save(organizationId, campaign, pending.version);
    const destinations = accounts.map((socialAccountId, index) =>
      Publication.create(
        uuid(),
        {
          organizationId,
          campaignId: campaign.id,
          approvedContentId: campaign.approvedContentId!,
          socialAccountId,
          platform: index === 0 ? SocialPlatform.FACEBOOK : SocialPlatform.INSTAGRAM,
        },
        NOW,
      ),
    );
    return { campaign, publications: destinations };
  }
  async function load(campaign: Campaign): Promise<Context> {
    return {
      campaign: (await campaigns.findById(campaign.organizationId, campaign.id))!,
      publications: (await publications.listByCampaign(campaign.organizationId, campaign.id)).sort(
        (a, b) => a.socialAccountId.localeCompare(b.socialAccountId),
      ),
    };
  }
  async function start(context: Context): Promise<Context> {
    const next = context.campaign.startPublication(summary(...context.publications), NOW);
    await transaction.run(async (repositories) => {
      await repositories.campaigns.save(next.organizationId, next, context.campaign.version);
      for (const publication of context.publications)
        await repositories.publications.add(next.organizationId, publication);
    });
    return load(next);
  }
  async function commit(
    context: Context,
    nextPublications: Publication[],
    retry = false,
    at = NOW,
  ): Promise<Context> {
    const entries = summary(...nextPublications);
    const next = retry
      ? context.campaign.retryPublication(entries, at)
      : context.campaign.recordPublicationSummary(entries, at);
    await transaction.run(async (repositories) => {
      if (next !== context.campaign)
        await repositories.campaigns.save(next.organizationId, next, context.campaign.version);
      for (const publication of nextPublications) {
        const previous = context.publications.find((item) => item.id === publication.id)!;
        if (previous !== publication)
          await repositories.publications.save(next.organizationId, publication, previous.version);
      }
    });
    return load(next);
  }
  async function active(): Promise<Context> {
    const context = await start(await approved());
    return commit(
      context,
      context.publications.map((publication) => publication.startAttempt(uuid(), NOW)),
    );
  }

  it('atomically creates the exact pending destinations and reloads domain state through Nest', async () => {
    const original = await approved();
    const loaded = await start(original);
    expect(loaded.campaign.status).toBe(CampaignStatus.PUBLISHING);
    expect(loaded.publications).toHaveLength(2);
    for (const publication of loaded.publications) {
      expect(publicationState(publication)).toEqual(
        publicationState(original.publications.find((item) => item.id === publication.id)!),
      );
      expect(publication).toBeInstanceOf(Publication);
    }
  });

  it('persists partial success and retries only failed destinations, preserving successful attempts and IDs', async () => {
    const initial = await active();
    const first = initial.publications[0]!;
    const second = initial.publications[1]!;
    const outcomes = [
      first.recordSuccess(first.attempt!.id, 'external-one', NOW),
      second.recordFailure(second.attempt!.id, PublicationFailureCode.RATE_LIMITED, NOW),
    ];
    const partial = await commit(initial, outcomes);
    expect(partial.campaign.status).toBe(CampaignStatus.PARTIALLY_PUBLISHED);
    const successful = partial.publications[0]!;
    const retrying = await commit(
      partial,
      [successful, partial.publications[1]!.startAttempt(uuid(), LATER)],
      true,
      LATER,
    );
    expect(publicationState(retrying.publications[0]!)).toEqual(publicationState(successful));
    const retry = retrying.publications[1]!;
    expect(retry.attempt!.number).toBe(2);
    const published = await commit(
      retrying,
      [retrying.publications[0]!, retry.recordSuccess(retry.attempt!.id, 'external-two', LATER)],
      false,
      LATER,
    );
    expect(published.campaign.status).toBe(CampaignStatus.PUBLISHED);
    expect(published.publications.map((item) => item.externalPostId)).toEqual([
      'external-one',
      'external-two',
    ]);
    expect(
      await database.publicationAttempt.count({
        where: { publicationId: successful.id },
      }),
    ).toBe(1);
    expect(await database.publicationAttempt.count({ where: { publicationId: second.id } })).toBe(
      2,
    );
    expect(
      await database.publicationAttemptResult.findUnique({
        where: { attemptId: second.attempt!.id },
      }),
    ).toMatchObject({
      status: PublicationStatus.FAILED,
      failureCode: PublicationFailureCode.RATE_LIMITED,
    });
  });

  it('keeps repeated persisted confirmations unchanged and rejects contradictory and stale callbacks', async () => {
    const initial = await active();
    const failed = await commit(
      initial,
      initial.publications.map((item) =>
        item.recordFailure(item.attempt!.id, PublicationFailureCode.REJECTED, NOW),
      ),
    );
    expect(failed.campaign.status).toBe(CampaignStatus.FAILED);
    for (const item of failed.publications) {
      expect(item.recordFailure(item.attempt!.id, PublicationFailureCode.REJECTED, LATER)).toBe(
        item,
      );
      expect(() => item.recordSuccess(item.attempt!.id, 'contradiction', LATER)).toThrow(
        ConflictingPublicationResultError,
      );
    }
    const retried = await commit(
      failed,
      failed.publications.map((item) => item.startAttempt(uuid(), LATER)),
      true,
      LATER,
    );
    expect(() =>
      retried.publications[0]!.recordSuccess(failed.publications[0]!.attempt!.id, 'old', LATER),
    ).toThrow(StalePublicationAttemptError);
    const finished = await commit(
      retried,
      retried.publications.map((item) =>
        item.recordSuccess(item.attempt!.id, 'post-' + item.id, LATER),
      ),
      false,
      LATER,
    );
    for (const item of finished.publications)
      expect(item.recordSuccess(item.attempt!.id, item.externalPostId!, LATER)).toBe(item);
  });

  it('rejects a standalone publication insert and a summary-only update', async () => {
    const context = await approved();
    await expect(
      publications.add(context.campaign.organizationId, context.publications[0]!),
    ).rejects.toThrow();
    const next = context.campaign.startPublication(summary(...context.publications), NOW);
    await expect(
      campaigns.save(next.organizationId, next, context.campaign.version),
    ).rejects.toThrow();
    expect(await publications.listByCampaign(next.organizationId, next.id)).toHaveLength(0);
    expect((await campaigns.findById(next.organizationId, next.id))!.status).toBe(
      CampaignStatus.APPROVED,
    );
  });

  it('rejects a standalone attempt update and rolls back its root and history', async () => {
    const context = await start(await approved());
    const item = context.publications[0]!;
    const next = item.startAttempt(uuid(), NOW);
    await expect(publications.save(item.organizationId, next, item.version)).rejects.toThrow();
    expect((await publications.findById(item.organizationId, item.id))!.status).toBe(
      PublicationStatus.PENDING,
    );
    expect(await database.publicationAttempt.count({ where: { publicationId: item.id } })).toBe(0);
  });

  it('rolls back the entire batch if a later destination collides with an existing attempt ID', async () => {
    const existing = await active();
    const context = await start(await approved());
    const next = [
      context.publications[0]!.startAttempt(uuid(), NOW),
      context.publications[1]!.startAttempt(existing.publications[0]!.attempt!.id, NOW),
    ];
    await expect(commit(context, next)).rejects.toThrow(PersistenceConflictError);
    const after = await load(context.campaign);
    expect(after.campaign.version).toBe(context.campaign.version);
    expect(after.publications.every((item) => item.version === 0)).toBe(true);
    expect(
      await database.publicationAttempt.count({
        where: { publicationId: { in: context.publications.map((item) => item.id) } },
      }),
    ).toBe(0);
  });

  it('allows one concurrent writer and rolls back the other campaign, destination and attempt writes', async () => {
    const context = await start(await approved());
    const one = [context.publications[0]!.startAttempt(uuid(), NOW), context.publications[1]!];
    const two = [context.publications[0]!.startAttempt(uuid(), NOW), context.publications[1]!];
    const results = await Promise.allSettled([commit(context, one), commit(context, two)]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const error: unknown = results.find((result) => result.status === 'rejected')?.reason;
    expect(
      error instanceof ConcurrentPublicationModificationError ||
        error instanceof ConcurrentCampaignModificationError,
    ).toBe(true);
    const loaded = await load(context.campaign);
    expect(loaded.campaign.version).toBe(context.campaign.version + 1);
    expect(loaded.publications[0]!.version).toBe(1);
    expect(
      await database.publicationAttempt.count({
        where: { publicationId: context.publications[0]!.id },
      }),
    ).toBe(1);
  });

  it('enforces the expected publication version even when the campaign version is current', async () => {
    const original = await start(await approved());
    const current = await commit(
      original,
      original.publications.map((item) => item.startAttempt(uuid(), NOW)),
    );
    const stale = original.publications[0]!.startAttempt(uuid(), NOW);
    await expect(
      transaction.run(async (repositories) => {
        await repositories.publications.save(stale.organizationId, stale, 0);
      }),
    ).rejects.toThrow(ConcurrentPublicationModificationError);
    expect(
      (await campaigns.findById(current.campaign.organizationId, current.campaign.id))!.version,
    ).toBe(current.campaign.version);
  });

  it('scopes queries and writes, and never upserts missing publications', async () => {
    const context = await start(await approved());
    const item = context.publications[0]!;
    const other = uuid();
    expect(await publications.findById(other, item.id)).toBeNull();
    expect(await publications.listByCampaign(other, item.campaignId)).toEqual([]);
    await expect(publications.add(other, item)).rejects.toThrow(PersistenceScopeError);
    await expect(publications.save(other, item, 0)).rejects.toThrow(PersistenceScopeError);
    const missing = Publication.create(uuid(), item, NOW).startAttempt(uuid(), NOW);
    await expect(publications.save(item.organizationId, missing, 0)).rejects.toThrow(
      ConcurrentPublicationModificationError,
    );
    const foreign = Publication.create(
      item.id,
      { ...publicationState(item), organizationId: other },
      NOW,
    ).startAttempt(uuid(), NOW);
    await expect(publications.save(other, foreign, 0)).rejects.toThrow(
      ConcurrentPublicationModificationError,
    );
  });

  it('enforces logical destination uniqueness and cross-organization content foreign keys', async () => {
    const first = await start(await approved());
    const item = first.publications[0]!;
    await expect(
      publications.add(item.organizationId, Publication.create(uuid(), item, NOW)),
    ).rejects.toThrow(PersistenceConflictError);
    const second = await approved();
    const wrong = Publication.create(
      uuid(),
      {
        ...publicationState(second.publications[0]!),
        approvedContentId: item.approvedContentId,
      },
      NOW,
    );
    await expect(publications.add(wrong.organizationId, wrong)).rejects.toThrow(
      PersistenceReferenceError,
    );
  });

  it('rejects missing or mismatched destinations at commit even when writes bypass the repositories', async () => {
    const context = await approved();
    const next = context.campaign.startPublication(summary(...context.publications), NOW);
    await expect(
      transaction.run(async (repositories) => {
        await repositories.campaigns.save(next.organizationId, next, context.campaign.version);
        await repositories.publications.add(next.organizationId, context.publications[0]!);
      }),
    ).rejects.toThrow();
    expect(await publications.listByCampaign(next.organizationId, next.id)).toEqual([]);
    await expect(
      database.publication.create({
        data: PublicationMapper.toPersistence(context.publications[0]!),
      }),
    ).rejects.toThrow();
  });

  it('protects attempt and result history from SQL updates and deletion', async () => {
    const context = await active();
    const failed = await commit(
      context,
      context.publications.map((item) =>
        item.recordFailure(item.attempt!.id, PublicationFailureCode.REJECTED, NOW),
      ),
    );
    await commit(
      failed,
      failed.publications.map((item) => item.startAttempt(uuid(), LATER)),
      true,
      LATER,
    );
    const attemptId = context.publications[0]!.attempt!.id;
    await expect(
      database.publicationAttempt.update({
        where: { id: attemptId },
        data: { startedAt: LATER },
      }),
    ).rejects.toThrow();
    await expect(
      database.publicationAttempt.delete({ where: { id: attemptId } }),
    ).rejects.toThrow();
    await expect(
      database.publicationAttemptResult.update({
        where: { attemptId },
        data: { failureCode: PublicationFailureCode.RATE_LIMITED },
      }),
    ).rejects.toThrow();
    await expect(
      database.publicationAttemptResult.delete({ where: { attemptId } }),
    ).rejects.toThrow();
    await expect(
      database.publication.delete({ where: { id: context.publications[0]!.id } }),
    ).rejects.toThrow();
  });

  it('keeps successful publications terminal and prevents identity changes in SQL', async () => {
    const context = await active();
    const finished = await commit(
      context,
      context.publications.map((item) =>
        item.recordSuccess(item.attempt!.id, 'post-' + item.id, NOW),
      ),
    );
    const item = finished.publications[0]!;
    expect(() => item.startAttempt(uuid(), LATER)).toThrow();
    await expect(
      database.publication.update({
        where: { id: item.id },
        data: { socialAccountId: uuid(), version: { increment: 1 } },
      }),
    ).rejects.toThrow();
    await expect(
      database.publication.update({
        where: { id: item.id },
        data: {
          status: PublicationStatus.PUBLISHING,
          externalPostId: null,
          publishedAt: null,
          version: { increment: 1 },
        },
      }),
    ).rejects.toThrow();
  });

  it('does not allow a historical attempt ID to be reused after further retries', async () => {
    const first = await active();
    let context = await commit(
      first,
      first.publications.map((item) =>
        item.recordFailure(item.attempt!.id, PublicationFailureCode.REJECTED, NOW),
      ),
    );
    context = await commit(
      context,
      context.publications.map((item) => item.startAttempt(uuid(), NOW)),
      true,
    );
    context = await commit(
      context,
      context.publications.map((item) =>
        item.recordFailure(item.attempt!.id, PublicationFailureCode.REJECTED, NOW),
      ),
    );
    const next = context.publications.map((item, index) =>
      item.startAttempt(first.publications[index]!.attempt!.id, NOW),
    );
    await expect(commit(context, next, true)).rejects.toThrow(PersistenceConflictError);
    expect((await load(context.campaign)).publications.map((item) => item.attempt!.number)).toEqual(
      [2, 2],
    );
  });

  it('rejects duplicate attempt numbers and contradictory outcomes in SQL', async () => {
    const context = await active();
    const item = context.publications[0]!;
    await expect(
      database.publicationAttempt.create({
        data: { ...PublicationMapper.attempt(item), id: uuid() },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const completed = await commit(
      context,
      context.publications.map((pub) => pub.recordSuccess(pub.attempt!.id, 'post-' + pub.id, NOW)),
    );
    await expect(
      database.publicationAttemptResult.create({
        data: {
          ...PublicationMapper.result(completed.publications[0]!),
          status: PublicationStatus.FAILED,
          externalPostId: null,
          failureCode: PublicationFailureCode.REJECTED,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
