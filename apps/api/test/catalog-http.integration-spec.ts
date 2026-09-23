import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '#app/app.module';
import { entityId } from '#app/domain/entity-id';
import { DATABASE_CONFIG, readDatabaseConfig } from '#app/config/database.config';
import { CATALOG_HTTP_CONFIG, type CatalogHttpConfig } from '#app/config/catalog-http.config';
import { configureHttp } from '#app/presentation/http/configure-http';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { CLOCK } from '#app/infrastructure/runtime.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { CreateOrganization } from '#app/modules/organizations/application/use-cases/create-organization';
import { CreateProduct } from '#app/modules/products/application/use-cases/create-product';
import { CreateTemplate } from '#app/modules/templates/application/use-cases/create-template';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { PrismaTemplateRepository } from '#app/modules/templates/infrastructure/persistence/prisma/prisma-template.repository';
import { TemplateMapper } from '#app/modules/templates/infrastructure/persistence/prisma/template.mapper';
import { TemplateDimensions } from '#app/modules/templates/domain/value-objects/template-dimensions';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { RecordGeneratedCampaign } from '#app/modules/campaigns/application/use-cases/record-generated-campaign';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import {
  PUBLICATION_TRANSACTION,
  type PublicationTransaction,
} from '#app/application/ports/publication-transaction';
import { Publication } from '#app/modules/publications/domain/entities/publication';
import { SocialPlatform } from '#app/modules/publications/domain/social-platform';
import { summary } from './support/publication-fixtures.js';

const NOW = new Date('2026-09-21T16:00:00.000Z');
const LATER = new Date('2026-09-21T17:00:00.000Z');
const productBody = {
  kind: 'PRODUCT',
  name: 'Catálogo HTTP',
  regularPrice: { amountMinor: 3500, currency: 'PEN' },
};
const templateBody = { name: 'Plantilla HTTP', dimensions: { width: 1080, height: 1080 } };

describe('Catalog HTTP with PostgreSQL', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let database: PrismaService;
  const context: CatalogHttpConfig = { organizationId: null };
  const clock = { value: NOW, now: () => new Date(clock.value) };
  beforeAll(async () => {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa pnpm test:integration con un esquema aislado.');
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(CATALOG_HTTP_CONFIG)
      .useValue(context)
      .overrideProvider(CLOCK)
      .useValue(clock)
      .overrideProvider(HTTP_LOGGER)
      .useValue({ log() {}, error() {} })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    database = module.get(PrismaService);
  });
  beforeEach(async () => {
    clock.value = NOW;
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Organización HTTP' })).id,
    );
  });
  afterAll(async () => {
    await app?.close();
  });

  async function campaignInput() {
    const organizationId = context.organizationId!;
    const product = await module.get(CreateProduct).execute({
      organizationId,
      kind: ProductKind.PRODUCT,
      name: 'Producto de campaña',
      regularPrice: productBody.regularPrice,
    });
    const template = await module.get(CreateTemplate).execute({ organizationId, ...templateBody });
    return {
      productId: product.id,
      templateId: template.id,
      templateRevisionId: template.currentRevision.id,
      title: 'Campaña HTTP',
      cta: 'Comprar',
      promotion: { amountMinor: 1000, currency: 'PEN', endsAt: '2099-12-31T23:59:59Z' },
    };
  }

  async function candidateCampaign() {
    const input = await campaignInput();
    const created = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    const selection = {
      organizationId: context.organizationId!,
      campaignId: entityId(created.body.data.id as string),
    };
    const generation = await module.get(RequestCampaignGeneration).execute(selection);
    return module.get(RecordGeneratedCampaign).execute({
      ...selection,
      generationId: generation.generation!.id,
      content: {
        headline: 'Oferta',
        caption: 'Descripción',
        cta: 'Comprar',
        hashtags: ['#oferta'],
        assetIds: [randomUUID()],
      },
    });
  }

  it('persists exactly one concurrent approval and retains the reviewed content', async () => {
    const candidate = await candidateCampaign();
    const path = `/campaigns/${candidate.id}/approve`;
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer()).post(path).send({ contentId: candidate.candidateContent!.id }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const persisted = await database.campaign.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(persisted).toMatchObject({
      status: 'APPROVED',
      approvedContentId: candidate.candidateContent!.id,
      version: BigInt(candidate.version + 1),
    });
    const detail = await request(app.getHttpServer())
      .get('/campaigns/' + candidate.id)
      .expect(200);
    expect(detail.body.data.candidateContent).toMatchObject({
      id: candidate.candidateContent!.id,
      headline: 'Oferta',
    });
    expect(detail.body.data.candidateContent).not.toHaveProperty('snapshot');
    expect(await database.publication.count({ where: { campaignId: candidate.id } })).toBe(0);
  });

  it('reads stored destinations with stable pagination and rejects a foreign campaign', async () => {
    const candidate = await candidateCampaign();
    const own = context.organizationId!;
    const campaigns = module.get(PrismaCampaignRepository);
    const pending = (await campaigns.findById(own, entityId(candidate.id)))!;
    const accounts = [entityId(randomUUID()), entityId(randomUUID())];
    const approved = pending.approve(candidate.candidateContent!.id, NOW, accounts);
    await campaigns.save(own, approved, pending.version);
    const publications = accounts.map((socialAccountId, index) =>
      Publication.create(
        randomUUID(),
        {
          organizationId: own,
          campaignId: approved.id,
          approvedContentId: approved.approvedContentId!,
          socialAccountId,
          platform: index === 0 ? SocialPlatform.FACEBOOK : SocialPlatform.INSTAGRAM,
        },
        NOW,
      ),
    );
    const publishing = approved.startPublication(summary(...publications), NOW);
    await module.get<PublicationTransaction>(PUBLICATION_TRANSACTION).run(async (repositories) => {
      await repositories.campaigns.save(own, publishing, approved.version);
      for (const publication of publications) await repositories.publications.add(own, publication);
    });
    const path = `/campaigns/${candidate.id}/publications`;
    const page = await request(app.getHttpServer())
      .get(path + '?page=2&limit=1')
      .expect(200);
    expect(page.body.data.map((item: { id: string }) => item.id)).toEqual(
      publications
        .map((item) => item.id)
        .sort()
        .slice(1),
    );
    expect(page.body).toMatchObject({
      meta: { page: 2, limit: 1, total: 2, totalPages: 2 },
      data: [{ status: 'PENDING', attempt: null, failureCode: null, externalPostId: null }],
    });
    const empty = await request(app.getHttpServer())
      .get(path + '?page=3&limit=1')
      .expect(200);
    expect(empty.body).toMatchObject({ data: [], meta: { total: 2 } });
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Ajena' })).id,
    );
    await request(app.getHttpServer()).get(path).expect(404);
    context.organizationId = own;
    const draft = await request(app.getHttpServer())
      .post('/campaigns')
      .send(await campaignInput())
      .expect(201);
    const noPublications = await request(app.getHttpServer())
      .get(`/campaigns/${draft.body.data.id}/publications`)
      .expect(200);
    expect(noPublications.body).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('persists a draft campaign with the selected revision and reads it without generating content', async () => {
    const input = await campaignInput();
    const created = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    const id: string = created.body.data.id;
    expect(await database.campaign.findUniqueOrThrow({ where: { id } })).toMatchObject({
      organizationId: context.organizationId,
      templateRevisionId: input.templateRevisionId,
      status: 'DRAFT',
      version: 0n,
      currentGenerationId: null,
    });
    const read = await request(app.getHttpServer())
      .get('/campaigns/' + id)
      .expect(200);
    expect(read.body).toEqual(created.body);
    expect(created.body.data.promotion.endsAt).toBe('2099-12-31T23:59:59.000Z');
  });

  it('paginates campaigns deterministically and keeps counts and detail scoped', async () => {
    const input = await campaignInput();
    const own = context.organizationId!;
    const ids: string[] = [];
    for (let index = 0; index < 3; index++) {
      const result = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
      ids.push(result.body.data.id as string);
    }
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Otra empresa' })).id,
    );
    const otherInput = await campaignInput();
    const other = await request(app.getHttpServer())
      .post('/campaigns')
      .send(otherInput)
      .expect(201);
    await request(app.getHttpServer())
      .get('/campaigns/' + ids[0])
      .expect(404);
    await request(app.getHttpServer()).post('/campaigns').send(input).expect(404);
    context.organizationId = own;
    await request(app.getHttpServer())
      .get('/campaigns/' + other.body.data.id)
      .expect(404);
    const page = await request(app.getHttpServer()).get('/campaigns?page=2&limit=2').expect(200);
    expect(page.body.data.map((item: { id: string }) => item.id)).toEqual(
      ids.sort().reverse().slice(2),
    );
    expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    const empty = await request(app.getHttpServer()).get('/campaigns?page=3&limit=2').expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta.total).toBe(3);
  });

  it('does not persist a campaign for invalid promotions or a revision belonging to another template', async () => {
    const input = await campaignInput();
    const another = await module
      .get(CreateTemplate)
      .execute({ organizationId: context.organizationId!, ...templateBody });
    await request(app.getHttpServer())
      .post('/campaigns')
      .send({ ...input, templateRevisionId: another.currentRevision.id })
      .expect(404);
    await request(app.getHttpServer())
      .post('/campaigns')
      .send({ ...input, promotion: { amountMinor: 999999, currency: 'PEN' } })
      .expect(400);
    expect(
      await database.campaign.count({ where: { organizationId: context.organizationId! } }),
    ).toBe(0);
  });

  it('persists HTTP product creation, retrieval and partial editing', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .send(productBody)
      .expect(201);
    const id: string = created.body.data.id;
    expect(await database.product.findUnique({ where: { id } })).toMatchObject({
      organizationId: context.organizationId,
      amountMinor: 3500n,
    });
    clock.value = LATER;
    await request(app.getHttpServer())
      .patch('/products/' + id)
      .send({ name: 'Editado', description: '' })
      .expect(200);
    const read = await request(app.getHttpServer())
      .get('/products/' + id)
      .expect(200);
    expect(read.body.data).toMatchObject({
      id,
      name: 'Editado',
      regularPrice: productBody.regularPrice,
      updatedAt: LATER.toISOString(),
    });
    expect((await database.product.findUniqueOrThrow({ where: { id } })).name).toBe('Editado');
  });

  it('paginates both tables with stable UUID ordering for equal dates and scoped totals', async () => {
    const own = context.organizationId!;
    const other = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Otra organización' })).id,
    );
    const products = [];
    const templates = [];
    for (let index = 0; index < 5; index++) {
      products.push(
        await module.get(CreateProduct).execute({
          organizationId: own,
          kind: ProductKind.PRODUCT,
          name: 'Producto ' + index,
          regularPrice: productBody.regularPrice,
        }),
      );
      templates.push(
        await module.get(CreateTemplate).execute({ organizationId: own, ...templateBody }),
      );
    }
    await module.get(CreateProduct).execute({
      organizationId: other,
      kind: ProductKind.SERVICE,
      name: 'Ajeno',
      regularPrice: productBody.regularPrice,
    });
    await module.get(CreateTemplate).execute({ organizationId: other, ...templateBody });
    for (const [path, records] of [
      ['/products', products],
      ['/templates', templates],
    ] as const) {
      const ids = records
        .map((item) => item.id)
        .sort()
        .reverse();
      const page = await request(app.getHttpServer())
        .get(path + '?page=2&limit=2')
        .expect(200);
      expect(page.body.data.map((item: { id: string }) => item.id)).toEqual(ids.slice(2, 4));
      expect(page.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
      const empty = await request(app.getHttpServer())
        .get(path + '?page=4&limit=2')
        .expect(200);
      expect(empty.body.data).toEqual([]);
      expect(empty.body.meta.total).toBe(5);
    }
  });

  it('loads the persisted current template revision and preserves historical revisions', async () => {
    const created = await request(app.getHttpServer())
      .post('/templates')
      .send(templateBody)
      .expect(201);
    const id = entityId(created.body.data.id);
    const repository = module.get(PrismaTemplateRepository);
    const original = (await repository.findById(context.organizationId!, id))!;
    const next = original.createRevision(
      randomUUID(),
      TemplateDimensions.create(1080, 1080),
      LATER,
    );
    const row = TemplateMapper.toPersistence(next);
    await database.$transaction(async (tx) => {
      await tx.templateRevision.create({ data: row.revision });
      await tx.template.update({
        where: { id },
        data: { currentRevisionId: row.revision.id, updatedAt: LATER },
      });
    });
    const read = await request(app.getHttpServer())
      .get('/templates/' + id)
      .expect(200);
    expect(read.body.data.currentRevision).toMatchObject({
      id: next.currentRevision.id,
      number: 2,
      createdAt: LATER.toISOString(),
    });
    expect(await database.templateRevision.count({ where: { templateId: id } })).toBe(2);
  });

  it('hides another organization resources in detail, updates and lists', async () => {
    const other = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Otra organización' })).id,
    );
    const product = await module.get(CreateProduct).execute({
      organizationId: other,
      kind: ProductKind.PRODUCT,
      name: 'Ajeno',
      regularPrice: productBody.regularPrice,
    });
    const template = await module
      .get(CreateTemplate)
      .execute({ organizationId: other, ...templateBody });
    await request(app.getHttpServer())
      .get('/products/' + product.id)
      .expect(404);
    await request(app.getHttpServer())
      .patch('/products/' + product.id)
      .send({ name: 'Cambio ajeno' })
      .expect(404);
    await request(app.getHttpServer())
      .get('/templates/' + template.id)
      .expect(404);
    for (const path of ['/products', '/templates']) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('X-Organization-Id', other)
        .expect(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    }
    expect((await database.product.findUniqueOrThrow({ where: { id: product.id } })).name).toBe(
      'Ajeno',
    );
  });

  it('does not persist invalid HTTP input or create resources for nonexistent organizations', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...productBody, organizationId: context.organizationId })
      .expect(400);
    await request(app.getHttpServer())
      .post('/templates')
      .send({ ...templateBody, dimensions: { width: 1080, height: 1920 } })
      .expect(400);
    expect(
      await database.product.count({ where: { organizationId: context.organizationId! } }),
    ).toBe(0);
    expect(
      await database.template.count({ where: { organizationId: context.organizationId! } }),
    ).toBe(0);
    context.organizationId = entityId(randomUUID());
    for (const [path, body] of [
      ['/products', productBody],
      ['/templates', templateBody],
    ] as const) {
      const response = await request(app.getHttpServer()).post(path).send(body).expect(404);
      expect(response.body.error.code).toBe('ORGANIZATION_NOT_FOUND');
    }
  });
});
