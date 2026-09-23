import { Test } from '@nestjs/testing';
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
  const context: { organizationId: string | null } = { organizationId: ORG };
  beforeEach(async () => {
    repository = new CampaignRepositoryFake();
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
