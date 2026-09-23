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
