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
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import type { GenerateImageInput } from '#app/modules/content-generation/application/ports/image-generator';
import {
  IMAGE_GENERATOR,
  type ImageGenerator,
} from '#app/modules/content-generation/application/ports/image-generator';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import {
  CAMPAIGN_FINAL_ASSETS,
  type CampaignFinalAssets,
} from '#app/modules/campaigns/application/ports/campaign-final-assets';
import { entityId } from '#app/domain/entity-id';
import { ImagePersistenceContext, uuid } from './support/image-persistence-context.js';

describe('Final flyer HTTP (real database, storage and composition)', () => {
  const context = new ImagePersistenceContext();
  const catalog: CatalogHttpConfig = { organizationId: null };
  const bucket = 'creovexa-test-flyer-' + randomUUID().replaceAll('-', '');
  let client: S3Client;
  let app: INestApplication<App>;
  let directory: string;
  let artifacts: LocalImageArtifacts;
  let photo: Buffer;
  let creative: Buffer;
  let created = false;
  const generate = vi.fn(async (input: GenerateImageInput) => {
    expect(await artifacts.read({ ...input, source: input.referenceImage })).toEqual(photo);
    return {
      reference: await artifacts.write(input, creative),
      width: 1080,
      height: 1080,
      contentType: 'image/png' as const,
    };
  });
  const generator: ImageGenerator = { assertAvailable() {}, generate };
  beforeAll(async () => {
    const config = readStorageConfig({
      STORAGE_ENDPOINT: process.env.TEST_STORAGE_ENDPOINT,
      STORAGE_BUCKET: bucket,
      STORAGE_ACCESS_KEY: process.env.TEST_STORAGE_ACCESS_KEY,
      STORAGE_SECRET_KEY: process.env.TEST_STORAGE_SECRET_KEY,
    });
    directory = await mkdtemp(join(tmpdir(), 'creovexa-flyer-test-'));
    artifacts = new LocalImageArtifacts(directory);
    await context.init({ storage: config, catalog, artifacts, imageGenerator: generator });
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
    photo = await sharp({ create: { width: 360, height: 480, channels: 3, background: '#995522' } })
      .png()
      .toBuffer();
    creative = await sharp({
      create: { width: 1080, height: 1080, channels: 3, background: '#223366' },
    })
      .png()
      .toBuffer();
  });
  afterAll(async () => {
    try {
      if (created && /^creovexa-test-flyer-[0-9a-f]{32}$/.test(bucket)) {
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
        resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-flyer-test-')
      )
        await rm(directory, { recursive: true });
    }
  });
  async function fixture(withCopy = true) {
    const f = await context.fixture();
    catalog.organizationId = f.selection.organizationId;
    await request(app.getHttpServer())
      .post(`/products/${f.campaign.productId}/image`)
      .attach('image', photo, 'photo.png')
      .expect(201);
    const draft = await context.module.get(CreateCampaign).execute({
      organizationId: f.selection.organizationId,
      productId: f.campaign.productId,
      templateId: f.campaign.templateId,
      templateRevisionId: f.campaign.templateRevisionId,
      title: 'Flyer HTTP',
      cta: 'Comprar',
    });
    const selection = {
      organizationId: f.selection.organizationId,
      campaignId: entityId(draft.id),
    };
    const campaign = await context.module.get(RequestCampaignGeneration).execute(selection);
    const generationId = campaign.generation!.id;
    if (withCopy)
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
    return { ...selection, generationId };
  }
  function post(input: Awaited<ReturnType<typeof fixture>>) {
    return request(app.getHttpServer())
      .post(`/campaigns/${input.campaignId}/image`)
      .send({ generationId: input.generationId });
  }
  // Requests the flyer, lets the worker run and returns the finished status.
  async function generated(input: Awaited<ReturnType<typeof fixture>>) {
    const accepted = await post(input).expect(202);
    expect(accepted.body.data).toMatchObject({ status: 'PENDING', finalAssetUrl: null });
    await context.queue.drain();
    return request(app.getHttpServer()).get(`/campaigns/${input.campaignId}/image`).expect(200);
  }
  it('generates, reads, replays and approves exactly the final PNG', async () => {
    const f = await fixture();
    const before = generate.mock.calls.length;
    const response = await generated(f);
    expect(response.body.data).toMatchObject({ generationId: f.generationId, status: 'READY' });
    const url = response.body.data.finalAssetUrl;
    const read = await request(app.getHttpServer()).get(url).expect(200);
    expect(read.headers['content-type']).toMatch(/^image\/png/);
    expect(read.headers['cache-control']).toBe('private, no-store');
    expect(read.headers['x-content-type-options']).toBe('nosniff');
    expect((await sharp(read.body).metadata()).width).toBe(1080);
    expect(read.body).not.toEqual(creative);
    expect(read.body).not.toEqual(photo);
    const detail = await request(app.getHttpServer()).get(`/campaigns/${f.campaignId}`).expect(200);
    expect(detail.body.data.status).toBe('PENDING_APPROVAL');
    expect(detail.body.data.candidateContent.finalAssetUrl).toBe(url);
    expect(detail.body.data.productImageUrl).not.toBe(url);
    const replay = await post(f).expect(202);
    expect(replay.body).toEqual(response.body);
    await context.queue.drain();
    expect(generate.mock.calls.length).toBe(before + 1);
    const assets = await context.database.campaignAsset.findMany({
      where: { campaignId: f.campaignId },
    });
    expect(assets).toHaveLength(2);
    const base = assets.find((asset) => asset.purpose === 'BASE_IMAGE')!;
    await request(app.getHttpServer())
      .get(`/campaigns/${f.campaignId}/assets/${base.id}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/campaigns/${f.campaignId}/approve`)
      .send({ contentId: response.body.data.contentId })
      .expect(200);
    await request(app.getHttpServer()).get(url).expect(200);
    const list = await request(app.getHttpServer()).get('/campaigns').expect(200);
    expect(
      list.body.data.find((item: { id: string }) => item.id === f.campaignId).candidateContent
        .finalAssetUrl,
    ).toBe(url);
  });
  it('rejects missing copy, stale generations, arbitrary inputs and foreign campaigns before AI', async () => {
    const f = await fixture(false);
    const before = generate.mock.calls.length;
    expect((await post(f).expect(409)).body.error.code).toBe('IMAGE_COPY_REQUIRED');
    await post({ ...f, generationId: uuid() }).expect(409);
    await request(app.getHttpServer())
      .post(`/campaigns/${f.campaignId}/image`)
      .send({ generationId: f.generationId, mainImage: 'https://evil.test/' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/campaigns/${f.campaignId}/image`)
      .send({})
      .expect(400);
    catalog.organizationId = uuid();
    await post(f).expect(404);
    expect(generate.mock.calls.length).toBe(before);
  });
  it('maps unavailable AI safely and preserves the generation for an explicit retry', async () => {
    const f = await fixture();
    const port = context.module.get<ImageGenerator>(IMAGE_GENERATOR);
    const available = vi.spyOn(port, 'assertAvailable').mockImplementationOnce(() => {
      throw new CampaignImageError('UNAVAILABLE');
    });
    const response = await post(f).expect(503);
    expect(response.body.error.code).toBe('IMAGE_UNAVAILABLE');
    const campaign = await context.campaigns.findById(f.organizationId, f.campaignId);
    expect(campaign?.status).toBe('GENERATING');
    expect(campaign?.candidateContent).toBeNull();
    expect(
      await context.database.campaignImageJob.count({ where: { generationId: f.generationId } }),
    ).toBe(0);
    available.mockRestore();
  });
  it('prevents reading another campaign asset even within the same organization', async () => {
    const f = await fixture();
    const result = await generated(f);
    const url = result.body.data.finalAssetUrl;
    const original = (await context.campaigns.findById(f.organizationId, f.campaignId))!;
    const sameOwner = await context.module.get(CreateCampaign).execute({
      organizationId: f.organizationId,
      productId: original.productId,
      templateId: original.templateId,
      templateRevisionId: original.templateRevisionId,
      title: 'Otra campaña',
      cta: 'Comprar',
    });
    await request(app.getHttpServer()).get(url.replace(f.campaignId, sameOwner.id)).expect(404);
    const alien = await context.fixture();
    catalog.organizationId = alien.selection.organizationId;
    await request(app.getHttpServer()).get(url).expect(404);
    await post(f).expect(404);
  });
  it('blocks preview and approval if the stored final bytes have changed', async () => {
    const f = await fixture();
    const result = await generated(f);
    const row = await context.database.campaignAsset.findFirstOrThrow({
      where: { campaignId: f.campaignId, purpose: 'FINAL_PIECE' },
    });
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: row.objectKey, Body: creative }));
    await request(app.getHttpServer()).get(result.body.data.finalAssetUrl).expect(502);
    await request(app.getHttpServer())
      .post(`/campaigns/${f.campaignId}/approve`)
      .send({ contentId: result.body.data.contentId })
      .expect(502);
    expect(
      (await context.campaigns.findById(f.organizationId, f.campaignId))?.approvedContentId,
    ).toBeNull();
    expect(
      await context.module
        .get<CampaignFinalAssets>(CAMPAIGN_FINAL_ASSETS)
        .readFinal({ ...f, generationId: entityId(f.generationId), assetId: uuid() }),
    ).toBeNull();
  });
});
