import { COPY_GENERATOR } from '#app/modules/content-generation/application/ports/copy-generator';
import { CAMPAIGN_FINAL_ASSETS } from '#app/modules/campaigns/application/ports/campaign-final-assets';
import { finalAssetsFake } from './support/final-assets-fake.js';
import { validCopy } from './support/generation-fakes.js';
import type { GenerationSnapshotData } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import { PrismaCampaignCopyRepository } from '#app/modules/content-generation/infrastructure/persistence/prisma/prisma-campaign-copy.repository';
import { CAMPAIGN_GENERATIONS } from '#app/modules/campaigns/contract';
import { JOB_QUEUE } from '#app/application/ports/job-queue';
import { JOBS_CONFIG } from '#app/config/jobs.config';
import { JobQueueFake } from './support/job-queue-fake.js';
import { randomUUID } from 'node:crypto';
import { FlyerDesign } from '#app/domain/value-objects/flyer-design';
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
const templateBody = { name: 'Plantilla HTTP' };

describe('Catalog HTTP with PostgreSQL', () => {
  let app: INestApplication<App>;
  let module: TestingModule;
  let database: PrismaService;
  const context: CatalogHttpConfig = { organizationId: null };
  const clock = { value: NOW, now: () => new Date(clock.value) };
  const queue = new JobQueueFake();
  const copyGenerator = {
    assertAvailable() {},
    generate: vi.fn(async (snapshot: GenerationSnapshotData) => validCopy(snapshot)),
  };
  beforeAll(async () => {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa pnpm test:integration con un esquema aislado.');
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CAMPAIGN_FINAL_ASSETS)
      .useValue(finalAssetsFake)
      .overrideProvider(COPY_GENERATOR)
      .useValue(copyGenerator)
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(CATALOG_HTTP_CONFIG)
      .useValue(context)
      .overrideProvider(CLOCK)
      .useValue(clock)
      .overrideProvider(HTTP_LOGGER)
      .useValue({ log() {}, error() {} })
      .overrideProvider(JOB_QUEUE)
      .useValue(queue)
      .overrideProvider(JOBS_CONFIG)
      .useValue({ worker: true })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    database = module.get(PrismaService);
  });
  beforeEach(async () => {
    clock.value = NOW;
    copyGenerator.generate.mockClear();
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Organización HTTP' })).id,
    );
  });
  afterAll(async () => {
    await app?.close();
  });

  it('persists the organization profile and preserves a different organization', async () => {
    const other = await module.get(CreateOrganization).execute({ name: 'Other organization' });
    await request(app.getHttpServer())
      .patch('/organization')
      .send({
        name: 'Saved organization',
        description: 'Stored profile',
        brandTone: 'Professional',
      })
      .expect(200);
    const saved = await request(app.getHttpServer()).get('/organization').expect(200);
    expect(saved.body.data).toMatchObject({
      id: context.organizationId,
      name: 'Saved organization',
      description: 'Stored profile',
      brandTone: 'Professional',
    });
    context.organizationId = entityId(other.id);
    const untouched = await request(app.getHttpServer()).get('/organization').expect(200);
    expect(untouched.body.data.name).toBe('Other organization');
  });

  it('saves the brand kit, changes only the region fields sent and resets the colors', async () => {
    const colors = {
      primary: '#5b3a29',
      secondary: '#C98B4E',
      accent: '#E4572E',
      lightBackground: '#F7F1E8',
      darkBackground: '#1E120D',
    };
    const saved = await request(app.getHttpServer())
      .patch('/organization')
      .send({ industry: 'Cafetería', region: { currency: 'USD' }, brandColors: colors })
      .expect(200);
    expect(saved.body.data).toMatchObject({
      industry: 'Cafetería',
      region: { country: 'PE', locale: 'es-PE', timeZone: 'America/Lima', currency: 'USD' },
      brandColors: { ...colors, primary: '#5B3A29' },
      effectiveBrandColors: { ...colors, primary: '#5B3A29' },
      logoTraits: null,
    });

    const reset = await request(app.getHttpServer())
      .patch('/organization')
      .send({ brandColors: null })
      .expect(200);
    expect(reset.body.data).toMatchObject({ brandColors: null, effectiveBrandColors: null });
    const read = await request(app.getHttpServer()).get('/organization').expect(200);
    expect(read.body.data.region.currency).toBe('USD');
  });

  it('saves the brand voice and replaces the contact as a whole', async () => {
    await request(app.getHttpServer())
      .patch('/organization')
      .send({
        typography: 'ROUNDED',
        visualStyle: ['cálido', 'artesanal'],
        contact: { whatsapp: '+51 999 999 999', instagram: '@cafe' },
        defaultLegalText: 'Imágenes referenciales.',
        forbiddenWords: ['gratis'],
      })
      .expect(200);
    const replaced = await request(app.getHttpServer())
      .patch('/organization')
      .send({ contact: { website: 'cafe.pe' } })
      .expect(200);
    expect(replaced.body.data).toMatchObject({
      typography: 'ROUNDED',
      visualStyle: ['cálido', 'artesanal'],
      contact: { whatsapp: null, website: 'cafe.pe', instagram: null, address: null },
      defaultLegalText: 'Imágenes referenciales.',
      forbiddenWords: ['gratis'],
    });
    await request(app.getHttpServer())
      .patch('/organization')
      .send({ typography: 'COMIC' })
      .expect(400);
  });

  // La forma la rechaza la validación de la petición; lo que exige conocer las zonas horarias
  // o los locales, el dominio.
  it.each([
    [{ region: { timeZone: 'Mars/Olympus' } }, 'INVALID_INPUT'],
    [{ region: { country: 'PER' } }, 'VALIDATION_ERROR'],
    [{ brandColors: { primary: '#000000' } }, 'VALIDATION_ERROR'],
    [{ industry: 'x'.repeat(81) }, 'VALIDATION_ERROR'],
  ])('rejects an invalid brand kit %j', async (body, code) => {
    const response = await request(app.getHttpServer())
      .patch('/organization')
      .send(body)
      .expect(400);
    expect(response.body.error.code).toBe(code);
  });

  it('returns real scoped totals including empty organizations', async () => {
    const empty = await request(app.getHttpServer()).get('/dashboard').expect(200);
    expect(empty.body.data.totals).toEqual({
      products: 0,
      templates: 0,
      campaigns: 0,
      published: 0,
      pendingApproval: 0,
    });
    const own = context.organizationId!;
    await request(app.getHttpServer())
      .post('/campaigns')
      .send(await campaignInput())
      .expect(201);
    const totals = await request(app.getHttpServer()).get('/dashboard').expect(200);
    expect(totals.body.data.totals).toMatchObject({
      products: 1,
      templates: 1,
      campaigns: 1,
      pendingApproval: 0,
    });
    expect(totals.body.data.campaignsByStatus).toEqual([{ status: 'DRAFT', count: 1 }]);
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Other dashboard' })).id,
    );
    const other = await request(app.getHttpServer())
      .get('/dashboard')
      .set('X-Organization-Id', own)
      .expect(200);
    expect(other.body.data.totals.campaigns).toBe(0);
  });
  it('edits templates atomically, detects concurrent revisions and preserves pinned campaigns', async () => {
    const input = await campaignInput();
    const campaign = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    clock.value = LATER;
    const responses = await Promise.all(
      ['One', 'Two'].map((name) =>
        request(app.getHttpServer())
          .patch('/templates/' + input.templateId)
          .send({ name, expectedRevisionId: input.templateRevisionId }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await database.templateRevision.count({ where: { templateId: input.templateId } })).toBe(
      2,
    );
    const read = await request(app.getHttpServer())
      .get('/templates/' + input.templateId)
      .expect(200);
    expect(read.body.data.currentRevision.number).toBe(2);
    const pinned = await request(app.getHttpServer())
      .get('/campaigns/' + campaign.body.data.id)
      .expect(200);
    expect(pinned.body.data.templateRevisionId).toBe(input.templateRevisionId);
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Other template' })).id,
    );
    await request(app.getHttpServer())
      .patch('/templates/' + input.templateId)
      .send({ name: 'Foreign', expectedRevisionId: read.body.data.currentRevision.id })
      .expect(404);
  });
  it('lists the base templates and copies one into the organization', async () => {
    const list = await request(app.getHttpServer()).get('/templates/base').expect(200);
    expect(list.body.data).toHaveLength(5);
    const launch = list.body.data.find((t: { key: string }) => t.key === 'LAUNCH');
    const copy = await request(app.getHttpServer())
      .post('/templates/base/LAUNCH')
      .send({ name: 'Mi lanzamiento' })
      .expect(201);
    expect(copy.body.data).toMatchObject({
      organizationId: context.organizationId,
      name: 'Mi lanzamiento',
      currentRevision: {
        number: 1,
        design: launch.design,
        dimensions: { width: 1080, height: 1350 },
      },
    });
    const unnamed = await request(app.getHttpServer())
      .post('/templates/base/PROMOTION')
      .send({})
      .expect(201);
    expect(unnamed.body.data.name).toBe('Promoción destacada');
    const missing = await request(app.getHttpServer())
      .post('/templates/base/NOPE')
      .send({})
      .expect(404);
    expect(missing.body.error.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('persists design over HTTP, retains the historical revision and rejects malformed configuration', async () => {
    const design = {
      ...FlyerDesign.create().data,
      format: 'STORY',
      composition: 'PRODUCT_PANEL',
      mode: 'LIGHT',
      elements: { ...FlyerDesign.create().data.elements, regularPrice: false, keyAttributes: 2 },
    };
    const created = await request(app.getHttpServer())
      .post('/templates')
      .send({ ...templateBody, design })
      .expect(201);
    expect(created.body.data.currentRevision.design).toEqual(design);
    // Las dimensiones salen del formato.
    expect(created.body.data.currentRevision.dimensions).toEqual({ width: 1080, height: 1920 });
    const revision = created.body.data.currentRevision.id;
    clock.value = LATER;
    const edited = await request(app.getHttpServer())
      .patch('/templates/' + created.body.data.id)
      .send({
        name: 'Diseño revisado',
        expectedRevisionId: revision,
        design: FlyerDesign.create().data,
      })
      .expect(200);
    expect(edited.body.data.currentRevision.design).toEqual(FlyerDesign.create().data);
    expect(
      (await database.templateRevision.findUniqueOrThrow({ where: { id: revision } })).design,
    ).toEqual(design);
    const read = await request(app.getHttpServer())
      .get('/templates/' + created.body.data.id)
      .expect(200);
    expect(read.body.data.currentRevision.design).toEqual(FlyerDesign.create().data);
    await request(app.getHttpServer())
      .post('/templates')
      .send({ ...templateBody, design: { ...design, html: '<script>' } })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/templates/' + created.body.data.id)
      .send({
        name: 'Inválida',
        expectedRevisionId: edited.body.data.currentRevision.id,
        design: { ...design, elements: { ...design.elements, logo: 'false' } },
      })
      .expect(400);
    expect(
      await database.templateRevision.count({ where: { templateId: created.body.data.id } }),
    ).toBe(2);
    await expect(
      database.templateRevision.update({
        where: { id: revision },
        data: {
          design: {
            ...FlyerDesign.create().data,
            elements: { ...FlyerDesign.create().data.elements },
          },
        },
      }),
    ).rejects.toThrow();
    await expect(
      database.templateRevision.create({
        data: {
          id: randomUUID(),
          templateId: created.body.data.id,
          organizationId: context.organizationId!,
          number: 3n,
          width: 1080,
          height: 1080,
          createdAt: LATER,
          design: { layout: 'CLASSIC' },
        },
      }),
    ).rejects.toThrow();
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

  it.each(['products', 'templates'] as const)(
    'archiva y restaura %s sin romper referencias y valida organización y filtros',
    async (catalog) => {
      const input = await campaignInput();
      const campaign = await request(app.getHttpServer())
        .post('/campaigns')
        .send(input)
        .expect(201);
      const id = catalog === 'products' ? input.productId : input.templateId;
      const path = '/' + catalog + '/' + id;
      const before = (await request(app.getHttpServer()).get(path).expect(200)).body.data;
      clock.value = LATER;
      const archived = await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({ archived: true })
        .expect(200);
      expect(archived.body.data.archivedAt).toBe(LATER.toISOString());
      expect(archived.body.data.updatedAt).toBe(before.updatedAt);
      if (catalog === 'templates')
        expect(archived.body.data.currentRevision).toEqual(before.currentRevision);
      clock.value = new Date(LATER.getTime() + 1000);
      const repeated = await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({ archived: true })
        .expect(200);
      expect(repeated.body.data.archivedAt).toBe(LATER.toISOString());
      expect(
        (
          await request(app.getHttpServer())
            .get('/' + catalog)
            .expect(200)
        ).body.meta.total,
      ).toBe(0);
      expect(
        (
          await request(app.getHttpServer())
            .get('/' + catalog + '?status=archived')
            .expect(200)
        ).body.meta.total,
      ).toBe(1);
      expect(
        (
          await request(app.getHttpServer())
            .get('/' + catalog + '?status=all')
            .expect(200)
        ).body.meta.total,
      ).toBe(1);
      await request(app.getHttpServer())
        .get('/' + catalog + '?status=invalid')
        .expect(400);
      await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({ archived: 'false' })
        .expect(400);
      await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({})
        .expect(400);
      await request(app.getHttpServer()).post('/campaigns').send(input).expect(404);
      await request(app.getHttpServer())
        .post('/campaigns/' + campaign.body.data.id + '/copy')
        .expect(404);
      const historical = await request(app.getHttpServer())
        .get('/campaigns/' + campaign.body.data.id)
        .expect(200);
      expect(historical.body.data.productId).toBe(input.productId);
      const own = context.organizationId;
      context.organizationId = entityId(
        (await module.get(CreateOrganization).execute({ name: 'Otra organización' })).id,
      );
      await request(app.getHttpServer()).get(path).expect(404);
      await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({ archived: false })
        .expect(404);
      context.organizationId = own;
      // Una edición posterior conserva el archivado y no modifica revisiones históricas.
      await request(app.getHttpServer())
        .patch(path)
        .send(
          catalog === 'products'
            ? { name: 'Editado' }
            : { name: 'Editada', expectedRevisionId: before.currentRevision.id },
        )
        .expect(200);
      expect((await request(app.getHttpServer()).get(path).expect(200)).body.data.archivedAt).toBe(
        LATER.toISOString(),
      );
      await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({ archived: false })
        .expect(200);
      await request(app.getHttpServer())
        .patch(path + '/archive')
        .send({ archived: false })
        .expect(200);
      expect(
        (
          await request(app.getHttpServer())
            .get('/' + catalog)
            .expect(200)
        ).body.meta.total,
      ).toBe(1);
      await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    },
  );

  it('conserva snapshots ya generados cuando se archiva el catálogo', async () => {
    const input = await campaignInput();
    const created = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    const base = '/campaigns/' + created.body.data.id;
    await request(app.getHttpServer())
      .post(base + '/copy')
      .expect(202);
    await queue.drain();
    const before = await request(app.getHttpServer()).get(base).expect(200);
    await request(app.getHttpServer())
      .patch('/products/' + input.productId + '/archive')
      .send({ archived: true })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/templates/' + input.templateId + '/archive')
      .send({ archived: true })
      .expect(200);
    const after = await request(app.getHttpServer()).get(base).expect(200);
    expect(after.body.data).toEqual(before.body.data);
    await request(app.getHttpServer())
      .get(base + '/copy')
      .expect(200);
  });

  it('persists copy once without allowing approval and isolates organization access', async () => {
    const input = await campaignInput();
    const created = await request(app.getHttpServer()).post('/campaigns').send(input).expect(201);
    const path = '/campaigns/' + created.body.data.id + '/copy';
    expect((await request(app.getHttpServer()).get(path).expect(200)).body.data).toBeNull();
    const accepted = await request(app.getHttpServer()).post(path).expect(202);
    expect(accepted.body.data).toMatchObject({ status: 'PENDING', copy: null });
    expect(copyGenerator.generate).not.toHaveBeenCalled();
    const pending = await request(app.getHttpServer()).get(path).expect(200);
    expect(pending.body.data).toMatchObject({
      generationId: accepted.body.data.generationId,
      status: 'PENDING',
    });
    await queue.drain();
    const result = await request(app.getHttpServer()).get(path).expect(200);
    expect(result.body.data.status).toBe('READY');
    expect(result.body.data.copy.caption).toContain('S/ 10.00');
    const again = await request(app.getHttpServer()).post(path).expect(202);
    expect(again.body.data).toEqual(result.body.data);
    await queue.drain();
    expect(copyGenerator.generate).toHaveBeenCalledTimes(1);
    const campaign = await database.campaign.findUniqueOrThrow({
      where: { id: created.body.data.id },
    });
    expect(campaign.status).toBe('GENERATING');
    expect(campaign.candidateContentId).toBeNull();
    expect(await database.campaignCopy.count({ where: { campaignId: campaign.id } })).toBe(1);
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Other copy owner' })).id,
    );
    await request(app.getHttpServer()).get(path).expect(404);
    await request(app.getHttpServer()).post(path).expect(404);
  });
  it('lets the user correct the flyer texts until the image is requested', async () => {
    const created = await request(app.getHttpServer())
      .post('/campaigns')
      .send(await campaignInput())
      .expect(201);
    const path = '/campaigns/' + created.body.data.id + '/copy';
    const { generationId } = (await request(app.getHttpServer()).post(path).expect(202)).body.data;
    await queue.drain();
    const before = (await request(app.getHttpServer()).get(path).expect(200)).body.data.copy;
    const edited = await request(app.getHttpServer())
      .patch(path)
      .send({ generationId, headline: ' Tu producto  favorito ', subheadline: 'Hecho para ti' })
      .expect(200);
    expect(edited.body.data.copy).toEqual({
      ...before,
      headline: 'Tu producto favorito',
      subheadline: 'Hecho para ti',
    });
    expect((await request(app.getHttpServer()).get(path).expect(200)).body.data.copy).toEqual(
      edited.body.data.copy,
    );
    const invalid = await request(app.getHttpServer())
      .patch(path)
      .send({ generationId, headline: 'Envío gratis', subheadline: null })
      .expect(400);
    expect(invalid.body.error.code).toBe('INVALID_INPUT');
    const shape = await request(app.getHttpServer())
      .patch(path)
      .send({ generationId, headline: 'x'.repeat(46) })
      .expect(400);
    expect(shape.body.error.code).toBe('VALIDATION_ERROR');
    const stale = await request(app.getHttpServer())
      .patch(path)
      .send({ generationId: randomUUID(), headline: 'Tu producto favorito', subheadline: null })
      .expect(409);
    expect(stale.body.error.code).toBe('STALE_GENERATION');
    // Con la imagen pedida, corregir el texto ya no tendría efecto en el flyer.
    await database.campaignImageJob.create({
      data: {
        organizationId: context.organizationId!,
        campaignId: created.body.data.id,
        generationId,
        token: randomUUID(),
        expectedVersion: 0n,
        status: 'QUEUED',
        expiresAt: NOW,
      },
    });
    const late = await request(app.getHttpServer())
      .patch(path)
      .send({ generationId, headline: 'Otro titular', subheadline: null })
      .expect(409);
    expect(late.body.error.code).toBe('INVALID_CAMPAIGN_STATE');
  });

  it('reads copies stored before the subheadline existed', async () => {
    const created = await request(app.getHttpServer())
      .post('/campaigns')
      .send(await campaignInput())
      .expect(201);
    const path = '/campaigns/' + created.body.data.id + '/copy';
    const { generationId } = (await request(app.getHttpServer()).post(path).expect(202)).body.data;
    await queue.drain();
    const legacy = {
      headline: 'Antes',
      caption: 'Producto de campaña PEN 20.00',
      cta: 'Comprar',
      hashtags: [],
      imagePrompt: 'Escena',
    };
    await database.campaignCopy.update({ where: { generationId }, data: { content: legacy } });
    const read = await request(app.getHttpServer()).get(path).expect(200);
    expect(read.body.data.copy).toEqual({
      headline: 'Antes',
      subheadline: null,
      caption: 'Producto de campaña PEN 20.00',
      cta: 'Comprar',
      hashtags: [],
    });
  });

  it('serializes copy leases, recovers expired work and fences stale completion', async () => {
    const created = await request(app.getHttpServer())
      .post('/campaigns')
      .send(await campaignInput())
      .expect(201);
    const selection = {
      organizationId: context.organizationId!,
      campaignId: entityId(created.body.data.id as string),
    };
    const campaign = await module.get(RequestCampaignGeneration).execute(selection);
    const repo = new PrismaCampaignCopyRepository(database, module.get(CAMPAIGN_GENERATIONS));
    const first = {
      ...selection,
      generationId: entityId(campaign.generation!.id),
      token: entityId(randomUUID()),
      now: NOW,
      expiresAt: new Date(NOW.getTime() + 120000),
    };
    const second = { ...first, token: entityId(randomUUID()) };
    expect((await Promise.all([repo.claim(first), repo.claim(second)])).sort()).toEqual([
      false,
      true,
    ]);
    const recovered = {
      ...second,
      token: entityId(randomUUID()),
      now: LATER,
      expiresAt: new Date(LATER.getTime() + 120000),
    };
    expect(await repo.claim(recovered)).toBe(true);
    const content = validCopy(campaign.generation!.snapshot);
    await expect(repo.complete(first, content)).rejects.toMatchObject({ code: 'BUSY' });
    await repo.complete(recovered, content);
    await repo.release(first);
    expect(await repo.find(first)).toEqual(content);
    expect(await repo.claim(recovered)).toBe(false);
  });

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

  it('regenerates, lists versions and restores an earlier one without reusing numbers', async () => {
    const candidate = await candidateCampaign();
    const base = '/campaigns/' + candidate.id;
    // Sin copy guardado para la versión 1, la regeneración pide uno nuevo.
    const regenerated = await request(app.getHttpServer())
      .post(base + '/regenerate')
      .expect(202);
    expect(regenerated.body.data).toMatchObject({ status: 'PENDING' });
    await queue.drain();
    const second = await database.campaign.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(second.status).toBe('GENERATING');
    const versions = (
      await request(app.getHttpServer())
        .get(base + '/versions')
        .expect(200)
    ).body.data;
    expect(versions.map((version: { number: number }) => version.number)).toEqual([2, 1]);
    expect(versions[1]).toMatchObject({
      current: false,
      content: { headline: 'Oferta', finalAssetUrl: expect.stringContaining('/assets/') },
    });
    const restored = await request(app.getHttpServer())
      .post(base + '/versions/' + candidate.generation!.id + '/restore')
      .send({ expectedVersion: Number(second.version) })
      .expect(200);
    expect(restored.body.data).toMatchObject({
      status: 'PENDING_APPROVAL',
      candidateContent: { id: candidate.candidateContent!.id },
    });
    // La vigente vuelve a ser la 1, que no tiene copy guardado: la tercera versión pide uno y
    // recibe el número 3, no el 2 que siguió a la vigente.
    const third = await request(app.getHttpServer())
      .post(base + '/regenerate')
      .expect(202);
    expect(third.body.data).toMatchObject({ status: 'PENDING' });
    const numbers = await database.campaignGeneration.findMany({
      where: { campaignId: candidate.id },
      orderBy: { number: 'asc' },
      select: { number: true },
    });
    expect(numbers.map((row) => Number(row.number))).toEqual([1, 2, 3]);
    const stale = await request(app.getHttpServer())
      .post(base + '/versions/' + candidate.generation!.id + '/restore')
      .send({ expectedVersion: Number(second.version) })
      .expect(409);
    expect(stale.body.error.code).toBe('CAMPAIGN_CONFLICT');
  });

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
    const globalPage = await request(app.getHttpServer())
      .get('/publications?limit=1&page=2')
      .expect(200);
    expect(globalPage.body.meta).toMatchObject({ total: 2, totalPages: 2 });
    expect(globalPage.body.data[0]).toMatchObject({ campaignId: candidate.id, publishedAt: null });
    const destination = publications[0]!;
    const started = destination.startAttempt(randomUUID(), NOW);
    const finished = started.recordSuccess(started.attempt!.id, 'external-post', LATER);
    await module.get<PublicationTransaction>(PUBLICATION_TRANSACTION).run(async (repositories) => {
      await repositories.publications.save(own, started, destination.version);
      await repositories.publications.save(own, finished, started.version);
      await repositories.campaigns.save(
        own,
        publishing.recordPublicationSummary(summary(finished, publications[1]!), LATER),
        publishing.version,
      );
    });
    const attempts = await request(app.getHttpServer())
      .get('/publications/' + destination.id + '/attempts')
      .expect(200);
    expect(attempts.body.data).toMatchObject([
      { number: 1, result: { status: 'PUBLISHED', externalPostId: 'external-post' } },
    ]);
    const realTotals = await request(app.getHttpServer()).get('/dashboard').expect(200);
    expect(realTotals.body.data.totals.published).toBe(1);
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
      data: [{ campaignId: candidate.id }],
    });
    const empty = await request(app.getHttpServer())
      .get(path + '?page=3&limit=1')
      .expect(200);
    expect(empty.body).toMatchObject({ data: [], meta: { total: 2 } });
    context.organizationId = entityId(
      (await module.get(CreateOrganization).execute({ name: 'Ajena' })).id,
    );
    await request(app.getHttpServer()).get(path).expect(404);
    await request(app.getHttpServer())
      .get('/publications/' + destination.id + '/attempts')
      .expect(404);
    const isolated = await request(app.getHttpServer()).get('/publications').expect(200);
    expect(isolated.body.meta.total).toBe(0);
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

  it('persists the flyer data of a product and clears it with null', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .send({
        ...productBody,
        shortName: 'Pack BAO Café',
        productBrand: 'BAO Café',
        keyAttributes: ['100 % arábica', 'Café de altura'],
        unit: 'por pack',
      })
      .expect(201);
    expect(created.body.data).toMatchObject({
      shortName: 'Pack BAO Café',
      productBrand: 'BAO Café',
      keyAttributes: ['100 % arábica', 'Café de altura'],
      unit: 'por pack',
      image: null,
    });
    const id: string = created.body.data.id;
    clock.value = LATER;
    await request(app.getHttpServer())
      .patch(`/products/${id}`)
      .send({ shortName: null, keyAttributes: ['Tostado medio'] })
      .expect(200);
    const read = await request(app.getHttpServer()).get(`/products/${id}`).expect(200);
    expect(read.body.data).toMatchObject({
      shortName: null,
      productBrand: 'BAO Café',
      keyAttributes: ['Tostado medio'],
    });
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...productBody, keyAttributes: ['1', '2', '3', '4', '5', '6'] })
      .expect(400);
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...productBody, shortName: 'x'.repeat(41) })
      .expect(400);
  });

  // Sin llamadas a la IA: el entorno puede tener una clave real (ADR-0031).
  it('reports whether sales suggestions are available and validates before calling the AI', async () => {
    const status = await request(app.getHttpServer())
      .get('/products/sales-suggestions/status')
      .expect(200);
    expect(typeof status.body.data.available).toBe('boolean');
    for (const body of [
      { kind: 'PRODUCT' },
      { kind: 'GIFT', name: 'Café' },
      { kind: 'PRODUCT', name: 'Café', keyAttributes: ['1', '2', '3', '4', '5', '6'] },
    ])
      await request(app.getHttpServer()).post('/products/sales-suggestions').send(body).expect(400);
  });

  it('persists the sales data of a product and the copy voice of the brand (ADR-0029)', async () => {
    const created = await request(app.getHttpServer())
      .post('/products')
      .send({
        ...productBody,
        benefits: ['Despierta sin acidez', 'Rinde 60 tazas'],
        idealFor: 'Quien toma café cada mañana',
      })
      .expect(201);
    expect(created.body.data).toMatchObject({
      benefits: ['Despierta sin acidez', 'Rinde 60 tazas'],
      idealFor: 'Quien toma café cada mañana',
    });
    clock.value = LATER;
    await request(app.getHttpServer())
      .patch(`/products/${created.body.data.id}`)
      .send({ idealFor: null })
      .expect(200);
    const product = await request(app.getHttpServer())
      .get(`/products/${created.body.data.id}`)
      .expect(200);
    expect(product.body.data).toMatchObject({
      benefits: ['Despierta sin acidez', 'Rinde 60 tazas'],
      idealFor: null,
    });
    await request(app.getHttpServer())
      .post('/products')
      .send({ ...productBody, benefits: ['x'.repeat(121)] })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/organization')
      .send({
        audience: 'Oficinistas de Lima',
        valueProps: ['Delivery en Lima'],
        emojiStyle: 'NONE',
        addressForm: 'USTED',
        copyExamples: ['Su café de cada mañana, listo en minutos.'],
      })
      .expect(200);
    const brand = await request(app.getHttpServer()).get('/organization').expect(200);
    expect(brand.body.data).toMatchObject({
      audience: 'Oficinistas de Lima',
      valueProps: ['Delivery en Lima'],
      emojiStyle: 'NONE',
      addressForm: 'USTED',
      copyExamples: ['Su café de cada mañana, listo en minutos.'],
    });
    await request(app.getHttpServer())
      .patch('/organization')
      .send({ emojiStyle: 'MANY' })
      .expect(400);
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
    const next = original.createRevision(randomUUID(), LATER);
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
