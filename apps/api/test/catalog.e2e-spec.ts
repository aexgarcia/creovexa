import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG } from '#app/config/database.config';
import { CATALOG_HTTP_CONFIG } from '#app/config/catalog-http.config';
import { configureHttp } from '#app/presentation/http/configure-http';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { PrismaProductRepository } from '#app/modules/products/infrastructure/persistence/prisma/prisma-product.repository';
import { PrismaTemplateRepository } from '#app/modules/templates/infrastructure/persistence/prisma/prisma-template.repository';
import { PrismaOrganizationLookup } from '#app/infrastructure/persistence/prisma/prisma-organization-lookup';
import {
  ProductRepositoryFake,
  OrganizationLookupFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
} from './support/commercial-fakes.js';
import { TemplateRepositoryFake } from './support/template-fakes.js';
import { Product } from '#app/modules/products/domain/entities/product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { Money } from '#app/domain/value-objects/money';
import { Template } from '#app/modules/templates/domain/entities/template';
import { TemplateDimensions } from '#app/modules/templates/domain/value-objects/template-dimensions';
import { PersistenceConflictError } from '#app/infrastructure/persistence/persistence.errors';

const validProduct = {
  kind: 'PRODUCT',
  name: 'Producto',
  regularPrice: { amountMinor: 1990, currency: 'PEN' },
};
const validTemplate = { name: 'Plantilla', dimensions: { width: 1080, height: 1080 } };

describe('Catalog HTTP with real use cases', () => {
  let app: INestApplication<App>;
  let products: ProductRepositoryFake;
  let templates: TemplateRepositoryFake;
  const context: { organizationId: string | null } = { organizationId: ORGANIZATION_ID };
  const logger = { log: vi.fn(), error: vi.fn() };

  beforeEach(async () => {
    products = new ProductRepositoryFake();
    templates = new TemplateRepositoryFake();
    context.organizationId = ORGANIZATION_ID;
    logger.log.mockClear();
    logger.error.mockClear();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue({ url: 'postgresql://unused:unused@127.0.0.1:1/unused', schema: 'public' })
      .overrideProvider(CATALOG_HTTP_CONFIG)
      .useValue(context)
      .overrideProvider(PrismaProductRepository)
      .useValue(products)
      .overrideProvider(PrismaTemplateRepository)
      .useValue(templates)
      .overrideProvider(PrismaOrganizationLookup)
      .useValue(new OrganizationLookupFake())
      .overrideProvider(HTTP_LOGGER)
      .useValue(logger)
      .compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
  });

  it('creates, reads, lists and partially updates a product through the real use cases', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .send({ ...validProduct, description: 'Inicial' })
      .expect(201);
    const id: string = created.body.data.id;
    expect(created.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.body.data).toMatchObject({
      ...validProduct,
      organizationId: ORGANIZATION_ID,
      imageAssetIds: [],
    });
    const updated = await request(app.getHttpServer())
      .patch('/products/' + id)
      .send({
        description: '',
        regularPrice: { amountMinor: 0, currency: 'USD' },
        imageAssetIds: [],
      })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      id,
      name: validProduct.name,
      description: '',
      regularPrice: { amountMinor: 0, currency: 'USD' },
    });
    const read = await request(app.getHttpServer())
      .get('/products/' + id)
      .expect(200);
    expect(read.body).toEqual(updated.body);
    const list = await request(app.getHttpServer()).get('/products?limit=1').expect(200);
    expect(list.body).toEqual({
      data: [updated.body.data],
      meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
    });
  });

  it('creates and reads a template with its revision, using a separate HTTP response', async () => {
    const created = await request(app.getHttpServer())
      .post('/templates')
      .send(validTemplate)
      .expect(201);
    expect(created.body.data.currentRevision).toMatchObject({
      number: 1,
      dimensions: validTemplate.dimensions,
    });
    expect(created.body.data.currentRevision).not.toHaveProperty('organizationId');
    expect(created.body.data.currentRevision).not.toHaveProperty('templateId');
    const read = await request(app.getHttpServer())
      .get('/templates/' + created.body.data.id)
      .expect(200);
    expect(read.body).toEqual(created.body);
    const list = await request(app.getHttpServer()).get('/templates').expect(200);
    expect(list.body.data).toEqual([read.body.data]);
  });

  it.each([
    { ...validProduct, organizationId: OTHER_ORGANIZATION_ID },
    { ...validProduct, name: ' ' },
    { ...validProduct, name: null },
    { ...validProduct, name: 'x'.repeat(201) },
    { ...validProduct, regularPrice: null },
    { ...validProduct, regularPrice: { amountMinor: '10', currency: 'PEN' } },
    { ...validProduct, regularPrice: { amountMinor: -1, currency: 'PEN' } },
    { ...validProduct, regularPrice: { amountMinor: 1.5, currency: 'PEN' } },
    {
      ...validProduct,
      regularPrice: { amountMinor: Number.MAX_SAFE_INTEGER + 1, currency: 'PEN' },
    },
    { ...validProduct, regularPrice: { amountMinor: 10, currency: 'XXX' } },
    { ...validProduct, regularPrice: { amountMinor: 10, currency: 'PEN', secret: 'hidden' } },
    { ...validProduct, imageAssetIds: null },
    { ...validProduct, description: null },
    { ...validProduct, imageAssetIds: ['not-a-uuid'] },
    { ...validProduct, imageAssetIds: [ORGANIZATION_ID, ORGANIZATION_ID.toUpperCase()] },
  ])('rejects invalid product input %# before writing', async (body) => {
    const result = await request(app.getHttpServer()).post('/products').send(body).expect(400);
    expect(result.body).toHaveProperty('error.code');
    expect(result.body.requestId).toBe(result.headers['x-request-id']);
    expect(products.records.size).toBe(0);
  });

  it.each([
    {},
    { name: null },
    { description: null },
    { regularPrice: null },
    { imageAssetIds: null },
    { kind: 'SERVICE' },
    { id: ORGANIZATION_ID },
    { regularPrice: { amountMinor: 1 } },
  ])('rejects invalid product patches %# without modifying data', async (body) => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .send(validProduct)
      .expect(201);
    await request(app.getHttpServer())
      .patch('/products/' + created.body.data.id)
      .send(body)
      .expect(400);
    expect(products.saveCount).toBe(0);
  });

  it.each([
    { ...validTemplate, dimensions: null },
    { ...validTemplate, dimensions: { width: '1080', height: 1080 } },
    { ...validTemplate, dimensions: { width: 1080, height: 1920 } },
    { ...validTemplate, name: '' },
    { ...validTemplate, organizationId: OTHER_ORGANIZATION_ID },
    { ...validTemplate, dimensions: { width: 0, height: 1080 } },
  ])('rejects invalid template input %#', async (body) => {
    await request(app.getHttpServer()).post('/templates').send(body).expect(400);
    expect(templates.records.size).toBe(0);
  });

  it.each([
    'page=0',
    'page=-1',
    'limit=101',
    'limit=1.5',
    'page=10001',
    'page=0x1',
    'limit=',
    'page=1&page=2',
    'organizationId=' + OTHER_ORGANIZATION_ID,
  ])('validates pagination %s on both resources', async (query) => {
    for (const path of ['/products', '/templates'])
      await request(app.getHttpServer())
        .get(path + '?' + query)
        .expect(400);
  });

  it('does not expose resources from another organization, even with a forged header', async () => {
    const product = Product.create(
      randomUUID(),
      OTHER_ORGANIZATION_ID,
      ProductKind.PRODUCT,
      { name: 'Ajeno', regularPrice: Money.fromMinorUnits(1, 'PEN') },
      new Date(),
    );
    products.records.set(product.id, product);
    const template = Template.create(
      randomUUID(),
      OTHER_ORGANIZATION_ID,
      randomUUID(),
      { name: 'Ajena', dimensions: TemplateDimensions.create(1080, 1080) },
      new Date(),
    );
    templates.records.set(template.id, template);
    for (const [path, id] of [
      ['/products', product.id],
      ['/templates', template.id],
    ]) {
      await request(app.getHttpServer())
        .get(path + '/' + id)
        .set('X-Organization-Id', OTHER_ORGANIZATION_ID)
        .expect(404);
      const list = await request(app.getHttpServer())
        .get(path)
        .set('X-Organization-Id', OTHER_ORGANIZATION_ID)
        .expect(200);
      expect(list.body.data).toEqual([]);
      expect(list.body.meta.total).toBe(0);
    }
    await request(app.getHttpServer())
      .patch('/products/' + product.id)
      .send({ name: 'Intruso' })
      .expect(404);
    expect(products.saveCount).toBe(0);
  });

  it('returns safe errors for malformed JSON, invalid IDs and unknown routes', async () => {
    for (const path of ['/products/invalid', '/templates/invalid']) {
      await request(app.getHttpServer()).get(path).expect(400);
    }
    const malformed = await request(app.getHttpServer())
      .post('/products')
      .set('Content-Type', 'application/json')
      .send('{"secret":"sensitive"')
      .expect(400);
    expect(JSON.stringify(malformed.body)).not.toContain('sensitive');
    const missing = await request(app.getHttpServer()).get('/missing?token=hidden').expect(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('disables the catalog without a configured organization while health remains available', async () => {
    context.organizationId = null;
    for (const path of ['/products', '/templates']) {
      const result = await request(app.getHttpServer()).get(path).expect(503);
      expect(result.body.error.code).toBe('CATALOG_UNAVAILABLE');
    }
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('maps conflicts and sanitizes unexpected errors and request logs', async () => {
    products.add = () => Promise.reject(new PersistenceConflictError());
    await request(app.getHttpServer()).post('/products').send(validProduct).expect(409);
    products.add = () => Promise.reject(new Error('password=do-not-log postgresql://secret'));
    const result = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', 'Bearer private-token')
      .set('X-Request-Id', 'untrusted')
      .send({ ...validProduct, description: 'private-body' })
      .expect(500);
    expect(result.body.error.code).toBe('INTERNAL_ERROR');
    expect(result.body.requestId).not.toBe('untrusted');
    const logs = JSON.stringify([...logger.log.mock.calls, ...logger.error.mock.calls]);
    for (const secret of ['do-not-log', 'postgresql:', 'private-token', 'private-body']) {
      expect(logs + JSON.stringify(result.body)).not.toContain(secret);
    }
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'http_request', route: '/products', statusCode: 500 }),
    );
  });

  it('documents the seven endpoints and typed response/error schemas in OpenAPI', async () => {
    const response = await request(app.getHttpServer()).get('/openapi.json').expect(200);
    const schema = response.body;
    expect(Object.keys(schema.paths)).toEqual(
      expect.arrayContaining(['/products', '/products/{id}', '/templates', '/templates/{id}']),
    );
    expect(
      schema.paths['/products'].post.requestBody.content['application/json'].schema.$ref,
    ).toContain('CreateProductRequest');
    expect(
      schema.paths['/products/{id}'].patch.responses['200'].content['application/json'].schema.$ref,
    ).toContain('ProductEnvelope');
    expect(
      schema.paths['/templates'].get.responses['200'].content['application/json'].schema.$ref,
    ).toContain('TemplatePageResponse');
    expect(schema.components.schemas.UpdateProductRequest.properties).not.toHaveProperty('kind');
    expect(schema.components.schemas.ProductPageResponse.properties.meta.$ref).toContain(
      'PaginationResponse',
    );
    expect(schema.components.schemas.ErrorResponse.properties.requestId.format).toBe('uuid');
    await request(app.getHttpServer()).get('/docs/').expect(200);
  });
});
