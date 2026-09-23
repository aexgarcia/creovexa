import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { PrismaPublicationRepository } from '#app/modules/publications/infrastructure/persistence/prisma/prisma-publication.repository';
import { PrismaPublicationCampaignLookup } from '#app/modules/publications/infrastructure/persistence/prisma/prisma-publication-campaign-lookup';
import { ConcurrentCampaignModificationError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { PublicationQueryFake } from './support/publication-query-fakes.js';
import { pendingPublications } from './support/publication-fixtures.js';
import { domainFixture, CAMPAIGN, CONTENT } from './support/campaign-fakes.js';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG } from '#app/config/database.config';
import { CATALOG_HTTP_CONFIG } from '#app/config/catalog-http.config';
import { CLOCK } from '#app/infrastructure/runtime.module';
import { configureHttp } from '#app/presentation/http/configure-http';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaCampaignLookups } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-lookups';
import {
  CampaignRepositoryFake,
  CampaignLookupsFake,
  ORG,
  OTHER_ORG,
  PRODUCT,
  TEMPLATE,
  TEMPLATE_REVISION,
  NOW,
  testId,
} from './support/campaign-fakes.js';

const body = {
  productId: PRODUCT,
  templateId: TEMPLATE,
  templateRevisionId: TEMPLATE_REVISION,
  title: ' Oferta ',
  cta: 'Comprar',
  promotion: { amountMinor: 1500, currency: 'PEN', endsAt: '2026-09-20T00:00:00Z' },
};

describe('Campaign HTTP with real use cases', () => {
  let app: INestApplication<App>;
  let repository: CampaignRepositoryFake;
  let publications: PublicationQueryFake;
  const context: { organizationId: string | null } = { organizationId: ORG };
  beforeEach(async () => {
    repository = new CampaignRepositoryFake();
    publications = new PublicationQueryFake();
    context.organizationId = ORG;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue({ url: 'postgresql://unused:unused@127.0.0.1:1/unused', schema: 'public' })
      .overrideProvider(CATALOG_HTTP_CONFIG)
      .useValue(context)
      .overrideProvider(CLOCK)
      .useValue({ now: () => new Date(NOW) })
      .overrideProvider(PrismaCampaignRepository)
      .useValue(repository)
      .overrideProvider(PrismaCampaignLookups)
      .useValue(new CampaignLookupsFake())
      .overrideProvider(PrismaPublicationRepository)
      .useValue(publications)
      .overrideProvider(PrismaPublicationCampaignLookup)
      .useValue({
        exists: async (organizationId: typeof ORG, campaignId: typeof CAMPAIGN) =>
          (await repository.findById(organizationId, campaignId)) !== null,
      })
      .overrideProvider(HTTP_LOGGER)
      .useValue({ log() {}, error() {} })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
  });

  it('creates a draft, gets it and returns the same explicit response in a paginated list', async () => {
    const created = await request(app.getHttpServer()).post('/campaigns').send(body).expect(201);
    expect(created.body.data).toMatchObject({
      organizationId: ORG,
      title: 'Oferta',
      instructions: '',
      status: 'DRAFT',
      version: 0,
      promotion: { startsAt: null, endsAt: '2026-09-20T00:00:00.000Z' },
    });
    expect(created.body.data).not.toHaveProperty('generation');
    expect(created.headers['x-request-id']).toBeTruthy();
    const read = await request(app.getHttpServer())
      .get('/campaigns/' + created.body.data.id)
      .expect(200);
    expect(read.body).toEqual(created.body);
    const list = await request(app.getHttpServer()).get('/campaigns?page=1&limit=1').expect(200);
    expect(list.body).toEqual({
      data: [created.body.data],
      meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
    });
    context.organizationId = OTHER_ORG;
    await request(app.getHttpServer())
      .get('/campaigns/' + created.body.data.id)
      .expect(404);
    expect((await request(app.getHttpServer()).get('/campaigns').expect(200)).body.data).toEqual(
      [],
    );
  });

  it('allows a draft without promotion', async () => {
    const input = { ...body, promotion: undefined };
    const result = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    expect(result.body.data.promotion).toBeNull();
  });

  it('shows candidate content, approves the exact revision and rejects a repeated approval', async () => {
    repository.records.set(CAMPAIGN, domainFixture().pending);
    const detail = await request(app.getHttpServer())
      .get('/campaigns/' + CAMPAIGN)
      .expect(200);
    expect(detail.body.data.candidateContent).toMatchObject({
      id: CONTENT,
      revision: 1,
      headline: 'Promoción',
    });
    expect(detail.body.data.candidateContent).not.toHaveProperty('snapshot');
    const approved = await request(app.getHttpServer())
      .post(`/campaigns/${CAMPAIGN}/approve`)
      .send({ contentId: CONTENT })
      .expect(200);
    expect(approved.body.data).toMatchObject({
      status: 'APPROVED',
      approvedContentId: CONTENT,
      version: detail.body.data.version + 1,
    });
    await request(app.getHttpServer())
      .post(`/campaigns/${CAMPAIGN}/approve`)
      .send({ contentId: CONTENT })
      .expect(409);
    expect(repository.saveCount).toBe(1);
    expect(publications.records.size).toBe(0);
  });

  it('rejects wrong state, stale content and concurrent approval without overwriting', async () => {
    repository.records.set(CAMPAIGN, domainFixture().draft);
    const path = `/campaigns/${CAMPAIGN}/approve`;
    expect(
      (await request(app.getHttpServer()).post(path).send({ contentId: CONTENT }).expect(409)).body
        .error.code,
    ).toBe('INVALID_CAMPAIGN_STATE');
    repository.records.set(CAMPAIGN, domainFixture().pending);
    expect(
      (
        await request(app.getHttpServer())
          .post(path)
          .send({ contentId: testId(999) })
          .expect(409)
      ).body.error.code,
    ).toBe('CONTENT_REVISION_MISMATCH');
    vi.spyOn(repository, 'save').mockRejectedValueOnce(new ConcurrentCampaignModificationError());
    expect(
      (await request(app.getHttpServer()).post(path).send({ contentId: CONTENT }).expect(409)).body
        .error.code,
    ).toBe('CAMPAIGN_CONFLICT');
    expect(repository.records.get(CAMPAIGN)!.status).toBe('PENDING_APPROVAL');
  });

  it.each([
    {},
    { contentId: null },
    { contentId: 'bad' },
    { contentId: CONTENT, organizationId: OTHER_ORG },
    { contentId: CONTENT, socialAccountIds: [] },
  ])('validates approval input %j', async (input) => {
    repository.records.set(CAMPAIGN, domainFixture().pending);
    await request(app.getHttpServer())
      .post(`/campaigns/${CAMPAIGN}/approve`)
      .send(input)
      .expect(400);
    expect(repository.saveCount).toBe(0);
  });

  it('paginates publications and distinguishes empty campaigns from inaccessible campaigns', async () => {
    repository.records.set(CAMPAIGN, domainFixture().pending);
    const path = `/campaigns/${CAMPAIGN}/publications`;
    expect((await request(app.getHttpServer()).get(path).expect(200)).body).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    for (const item of pendingPublications()) await publications.add(ORG, item);
    const page = await request(app.getHttpServer())
      .get(path + '?page=2&limit=1')
      .expect(200);
    expect(page.body).toMatchObject({
      data: [{ platform: 'INSTAGRAM', status: 'PENDING', attempt: null }],
      meta: { page: 2, limit: 1, total: 2, totalPages: 2 },
    });
    await request(app.getHttpServer())
      .get(path + '?limit=0')
      .expect(400);
    await request(app.getHttpServer())
      .get(path + '?organizationId=' + ORG)
      .expect(400);
    context.organizationId = OTHER_ORG;
    await request(app.getHttpServer()).get(path).expect(404);
    await request(app.getHttpServer())
      .post(`/campaigns/${CAMPAIGN}/approve`)
      .send({ contentId: CONTENT })
      .expect(404);
    context.organizationId = null;
    await request(app.getHttpServer()).get(path).expect(503);
    await request(app.getHttpServer())
      .post(`/campaigns/${CAMPAIGN}/approve`)
      .send({ contentId: CONTENT })
      .expect(503);
  });

  it.each([
    { title: ' ' },
    { cta: '' },
    { title: 'a'.repeat(201) },
    { instructions: null },
    { organizationId: OTHER_ORG },
    { status: 'APPROVED' },
    { productId: 'bad' },
    { promotion: null },
    { promotion: [] },
    { promotion: { amountMinor: 1 } },
    { promotion: { amountMinor: '100', currency: 'PEN' } },
    { promotion: { amountMinor: 2000, currency: 'PEN' } },
    { promotion: { amountMinor: 100, currency: 'USD' } },
    { promotion: { amountMinor: 100, currency: 'PEN', endsAt: '2026-09-17T00:00:00Z' } },
    { promotion: { amountMinor: 100, currency: 'PEN', endsAt: '2026-02-30T00:00:00Z' } },
    { promotion: { amountMinor: 100, currency: 'PEN', endsAt: '2026-10-20' } },
    { promotion: { amountMinor: 100, currency: 'PEN', endsAt: '2026-10-20T00:00:00' } },
    {
      promotion: {
        amountMinor: 100,
        currency: 'PEN',
        startsAt: '2026-10-20T00:00:00Z',
        endsAt: '2026-10-19T00:00:00Z',
      },
    },
  ])('rejects invalid input without writing: %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/campaigns')
      .send({ ...body, ...invalid })
      .expect(400);
    expect(repository.records.size).toBe(0);
  });

  it.each(['productId', 'templateId', 'templateRevisionId'])(
    'rejects missing or foreign %s',
    async (field) => {
      const result = await request(app.getHttpServer())
        .post('/campaigns')
        .send({ ...body, [field]: testId(999) })
        .expect(404);
      expect(result.body.error.code).toBe('CAMPAIGN_RESOURCE_NOT_FOUND');
      expect(repository.records.size).toBe(0);
    },
  );

  it('validates paths, query parameters and development context', async () => {
    await request(app.getHttpServer()).get('/campaigns/invalid').expect(400);
    const missing = await request(app.getHttpServer())
      .get('/campaigns/' + testId(999))
      .expect(404);
    expect(missing.body.error.code).toBe('CAMPAIGN_NOT_FOUND');
    for (const query of ['page=0', 'limit=101', 'page=1.5', 'organizationId=' + OTHER_ORG]) {
      await request(app.getHttpServer())
        .get('/campaigns?' + query)
        .expect(400);
    }
    context.organizationId = null;
    await request(app.getHttpServer()).get('/campaigns').expect(503);
  });

  it('documents create, list and detail without exposing workflow endpoints', async () => {
    const result = await request(app.getHttpServer()).get('/openapi.json').expect(200);
    expect(result.body.paths['/campaigns']).toHaveProperty('post');
    expect(result.body.paths['/campaigns']).toHaveProperty('get');
    expect(result.body.paths['/campaigns/{id}']).toHaveProperty('get');
    expect(result.body.paths).not.toHaveProperty('/campaigns/{id}/publish');
    expect(result.body.components.schemas.CampaignResponse.properties.promotion.nullable).toBe(
      true,
    );
  });
});
