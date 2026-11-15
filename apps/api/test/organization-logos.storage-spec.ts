import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { INestApplication } from '@nestjs/common';
import { readStorageConfig } from '#app/config/storage.config';
import type { CatalogHttpConfig } from '#app/config/catalog-http.config';
import { configureHttp } from '#app/presentation/http/configure-http';
import {
  ORGANIZATION_LOGOS,
  type OrganizationLogos,
} from '#app/modules/organizations/application/ports/organization-logos';
import { PrismaOrganizationRepository } from '#app/modules/organizations/infrastructure/persistence/prisma/prisma-organization.repository';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { MinioStorageProvider } from '#app/modules/content-generation/infrastructure/minio-storage-provider';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import {
  CAMPAIGN_RENDER_RESOURCES,
  type CampaignRenderResources,
} from '#app/modules/content-generation/application/ports/campaign-render-resources';
import {
  TEMPLATE_RENDERER,
  type TemplateRenderer,
  type RenderCampaignTemplateInput,
} from '#app/modules/content-generation/application/ports/template-renderer';
import { entityId } from '#app/domain/entity-id';
import { ImagePersistenceContext, uuid } from './support/image-persistence-context.js';

describe('Organization logos (HTTP, PostgreSQL, MinIO and flyer)', () => {
  const context = new ImagePersistenceContext();
  const catalog: CatalogHttpConfig = { organizationId: null };
  const bucket = 'creovexa-test-logo-' + randomUUID().replaceAll('-', '');
  let client: S3Client;
  let app: INestApplication<App>;
  let directory: string;
  let artifacts: LocalImageArtifacts;
  let png: Buffer;
  let created = false;
  beforeAll(async () => {
    const config = readStorageConfig({
      STORAGE_ENDPOINT: process.env.TEST_STORAGE_ENDPOINT,
      STORAGE_BUCKET: bucket,
      STORAGE_ACCESS_KEY: process.env.TEST_STORAGE_ACCESS_KEY,
      STORAGE_SECRET_KEY: process.env.TEST_STORAGE_SECRET_KEY,
    });
    directory = await mkdtemp(join(tmpdir(), 'creovexa-logo-test-'));
    artifacts = new LocalImageArtifacts(directory);
    await context.init({ storage: config, catalog, artifacts });
    app = context.module.createNestApplication<INestApplication<App>>({ logger: false });
    configureHttp(app);
    await app.init();
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    created = true;
    png = await sharp({
      create: {
        width: 180,
        height: 90,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
  });
  afterAll(async () => {
    try {
      if (created && /^creovexa-test-logo-[0-9a-f]{32}$/.test(bucket)) {
        const objects = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
        for (const object of objects.Contents ?? [])
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
        await client.send(new DeleteBucketCommand({ Bucket: bucket }));
      }
    } finally {
      client?.destroy();
      if (app) await app.close();
      else await context.close();
      if (
        directory &&
        resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-logo-test-')
      )
        await rm(directory, { recursive: true });
    }
  });
  async function fixture() {
    const f = await context.fixture();
    catalog.organizationId = f.selection.organizationId;
    return f;
  }
  function upload(bytes = png) {
    return request(app.getHttpServer())
      .post('/organization/logo')
      .attach('logo', bytes, { filename: 'brand.png', contentType: 'image/png' });
  }
  it('stores a real transparent logo privately and returns an owned read URL', async () => {
    await fixture();
    const saved = await upload().expect(201);
    expect(saved.body.data.logoAssetId).toBeTruthy();
    // El logo de prueba es blanco translúcido: sin tinta propia, propone la paleta neutra.
    expect(saved.body.data.logoTraits).toMatchObject({
      isDark: false,
      suggestedColors: { primary: '#111827' },
    });
    expect(saved.body.data.effectiveBrandColors).toEqual(
      saved.body.data.logoTraits.suggestedColors,
    );
    const read = await request(app.getHttpServer()).get(saved.body.data.logoUrl).expect(200);
    expect(read.body).toEqual(png);
    expect((await sharp(read.body).metadata()).hasAlpha).toBe(true);
    expect(read.headers['cache-control']).toBe('private, no-store');
    expect(read.headers['x-content-type-options']).toBe('nosniff');
    const row = await context.database.organizationLogoAsset.findUniqueOrThrow({
      where: { id: saved.body.data.logoAssetId },
    });
    expect(
      (await fetch(`${process.env.TEST_STORAGE_ENDPOINT}/${bucket}/${row.objectKey}`)).status,
    ).toBe(403);
    catalog.organizationId = uuid();
    await request(app.getHttpServer()).get(saved.body.data.logoUrl).expect(404);
    await upload().expect(404);
  });
  it('stores the light version and the icon apart from the main logo, and removes them', async () => {
    await fixture();
    const main = await upload().expect(201);
    const variant = (name: string) =>
      request(app.getHttpServer())
        .post('/organization/logo/' + name)
        .attach('logo', png, { filename: 'brand.png', contentType: 'image/png' });
    const dark = await variant('dark-background').expect(201);
    const icon = await variant('icon').expect(201);
    expect(icon.body.data.logoAssetId).toBe(main.body.data.logoAssetId);
    expect(icon.body.data.darkBackgroundLogoAssetId).toBe(dark.body.data.darkBackgroundLogoAssetId);
    expect(icon.body.data.iconAssetId).not.toBe(main.body.data.logoAssetId);
    await request(app.getHttpServer()).get(icon.body.data.iconUrl).expect(200);
    await variant('banner').expect(404);
    const removed = await request(app.getHttpServer())
      .delete('/organization/logo/dark-background')
      .expect(200);
    expect(removed.body.data).toMatchObject({
      darkBackgroundLogoAssetId: null,
      darkBackgroundLogoUrl: null,
      logoAssetId: main.body.data.logoAssetId,
    });
    // El archivo quitado sigue legible para los snapshots que lo usaron.
    await request(app.getHttpServer()).get(dark.body.data.darkBackgroundLogoUrl).expect(200);
  });

  it('rejects invalid, empty, oversized, extra and multiple files without losing the logo', async () => {
    await fixture();
    const saved = await upload().expect(201);
    await request(app.getHttpServer()).post('/organization/logo').expect(400);
    for (const bytes of [Buffer.alloc(0), Buffer.from('<svg/>'), png.subarray(0, 50)])
      await upload(bytes).expect(400);
    await upload(Buffer.alloc(10 * 1024 * 1024 + 1)).expect(413);
    await request(app.getHttpServer())
      .post('/organization/logo')
      .attach('logo', png, 'one.png')
      .attach('logo', png, 'two.png')
      .expect(400);
    await request(app.getHttpServer())
      .post('/organization/logo')
      .field('organizationId', uuid())
      .attach('logo', png, 'one.png')
      .expect(400);
    const current = await request(app.getHttpServer()).get('/organization').expect(200);
    expect(current.body.data.logoAssetId).toBe(saved.body.data.logoAssetId);
    expect(
      await context.database.organizationLogoAsset.count({
        where: { organizationId: catalog.organizationId! },
      }),
    ).toBe(1);
  });
  it('prevents stale profile and logo writes from overwriting a newer logo', async () => {
    const f = await fixture();
    const repository = new PrismaOrganizationRepository(context.database);
    const original = (await repository.findById(f.selection.organizationId))!;
    const saved = await upload().expect(201);
    await expect(
      repository.save(original.updateProfile({ name: 'Stale' }, new Date()), original.updatedAt),
    ).rejects.toHaveProperty('name', 'OrganizationProfileConflictError');
    await expect(
      context.module.get<OrganizationLogos>(ORGANIZATION_LOGOS).save({
        organizationId: f.selection.organizationId,
        assetId: uuid(),
        variant: 'MAIN',
        bytes: png,
        expectedUpdatedAt: original.updatedAt,
        at: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const current = await request(app.getHttpServer()).get('/organization').expect(200);
    expect(current.body.data.name).toBe(original.name);
    expect(current.body.data.logoAssetId).toBe(saved.body.data.logoAssetId);
    await request(app.getHttpServer())
      .patch('/organization')
      .send({ logoAssetId: null })
      .expect(400);
  });
  it('rotates phone uploads and detects corrupted storage', async () => {
    await fixture();
    const phone = await sharp(png).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const saved = await upload(phone).expect(201);
    const read = await request(app.getHttpServer()).get(saved.body.data.logoUrl).expect(200);
    expect(read.headers['content-type']).toMatch(/^image\/jpeg/);
    const metadata = await sharp(read.body).metadata();
    expect([metadata.width, metadata.height]).toEqual([90, 180]);
    const row = await context.database.organizationLogoAsset.findUniqueOrThrow({
      where: { id: saved.body.data.logoAssetId },
    });
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: row.objectKey, Body: Buffer.from('tampered') }),
    );
    const broken = await request(app.getHttpServer()).get(saved.body.data.logoUrl).expect(503);
    expect(broken.body.error.code).toBe('ORGANIZATION_LOGO_UNAVAILABLE');
  });
  it('pins the original logo in the snapshot and composes it after the company logo is replaced', async () => {
    const f = await fixture();
    const first = await upload().expect(201);
    const draft = await context.module.get(CreateCampaign).execute({
      organizationId: f.selection.organizationId,
      productId: f.campaign.productId,
      templateId: f.campaign.templateId,
      templateRevisionId: f.campaign.templateRevisionId,
      title: 'Logo fijado',
      cta: 'Comprar',
    });
    const selection = {
      organizationId: f.selection.organizationId,
      campaignId: entityId(draft.id),
    };
    await context.module.get(RequestCampaignGeneration).execute(selection);
    const campaign = (await context.campaigns.findById(
      selection.organizationId,
      selection.campaignId,
    ))!;
    const generationId = campaign.generation!.id;
    const lease = {
      ...selection,
      generationId,
      token: uuid(),
      expectedVersion: campaign.version,
      now: new Date(),
      expiresAt: new Date(Date.now() + 300_000),
    };
    await context.database.campaignCopy.create({
      data: {
        ...selection,
        generationId,
        token: uuid(),
        expiresAt: new Date(),
        status: 'READY',
        content: f.copy,
      },
    });
    expect(await context.images.claim(lease)).toBe(true);
    const second = await upload(await sharp(png).negate().png().toBuffer()).expect(201);
    expect(second.body.data.logoAssetId).not.toBe(first.body.data.logoAssetId);
    expect(campaign.generation!.snapshot.data.organization.logoAssetId).toBe(
      first.body.data.logoAssetId,
    );
    const scope = { ...selection, generationId, operationId: lease.token };
    const main = await sharp({
      create: { width: 1080, height: 1080, channels: 3, background: '#223366' },
    })
      .png()
      .toBuffer();
    const source = {
      reference: await artifacts.write(scope, main),
      contentType: 'image/png' as const,
      width: 1080,
      height: 1080,
    };
    const storage = context.module.get(MinioStorageProvider);
    const base = await storage.store({ ...scope, purpose: 'BASE_IMAGE', source });
    const input: RenderCampaignTemplateInput = {
      ...scope,
      mainImage: base.id,
      snapshot: campaign.generation!.snapshot.data,
      copy: f.copy,
    };
    const resources = await context.module
      .get<CampaignRenderResources>(CAMPAIGN_RENDER_RESOURCES)
      .load(input);
    expect(resources.logo?.bytes).toEqual(png);
    const rendered = await context.module.get<TemplateRenderer>(TEMPLATE_RENDERER).render(input);
    const bytes = await artifacts.read({ ...scope, source: rendered });
    expect((await sharp(bytes).metadata()).width).toBe(1080);
    expect(bytes).not.toEqual(main);
    await request(app.getHttpServer()).get(first.body.data.logoUrl).expect(200);
    const foreign = await context.fixture();
    const alien = await context.module.get<OrganizationLogos>(ORGANIZATION_LOGOS).read({
      organizationId: foreign.selection.organizationId,
      assetId: entityId(first.body.data.logoAssetId),
    });
    expect(alien).toBeNull();
  });
  it('keeps historical metadata immutable', async () => {
    await fixture();
    const saved = await upload().expect(201);
    await expect(
      context.database.organizationLogoAsset.update({
        where: { id: saved.body.data.logoAssetId },
        data: { objectKey: uuid() },
      }),
    ).rejects.toThrow();
    await expect(
      context.database.organizationLogoAsset.delete({ where: { id: saved.body.data.logoAssetId } }),
    ).rejects.toThrow();
    await request(app.getHttpServer()).get(saved.body.data.logoUrl).expect(200);
  });
});
