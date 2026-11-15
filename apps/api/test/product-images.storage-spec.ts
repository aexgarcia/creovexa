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
import { StoredProductImageSource } from '#app/modules/content-generation/infrastructure/stored-product-image-source';
import {
  PRODUCT_IMAGES,
  type ProductImages,
} from '#app/modules/products/application/ports/product-images';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { entityId } from '#app/domain/entity-id';
import { PhotoType } from '#app/modules/products/domain/photo-type';
import { ImagePersistenceContext, uuid } from './support/image-persistence-context.js';

describe('One product image (HTTP, PostgreSQL and MinIO)', () => {
  const context = new ImagePersistenceContext();
  const catalog: CatalogHttpConfig = { organizationId: null };
  const bucket = 'creovexa-test-product-' + randomUUID().replaceAll('-', '');
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
    directory = await mkdtemp(join(tmpdir(), 'creovexa-product-test-'));
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
    png = await sharp({ create: { width: 480, height: 640, channels: 3, background: '#223366' } })
      .png()
      .toBuffer();
  });
  afterAll(async () => {
    try {
      if (created && /^creovexa-test-product-[0-9a-f]{32}$/.test(bucket)) {
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
        resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-product-test-')
      )
        await rm(directory, { recursive: true });
    }
  });
  async function fixture() {
    const f = await context.fixture();
    catalog.organizationId = f.selection.organizationId;
    return { ...f, productId: f.campaign.productId };
  }
  function upload(productId: string, bytes = png, photoType = 'CUTOUT') {
    return request(app.getHttpServer())
      .post(`/products/${productId}/image`)
      .field('photoType', photoType)
      .attach('image', bytes, { filename: 'photo.png', contentType: 'image/png' });
  }

  // Las referencias de estilo de las plantillas usan el mismo almacenamiento.
  it('adds up to two style references to a template, each in a new revision, and removes one', async () => {
    await fixture();
    const created = await request(app.getHttpServer())
      .post('/templates')
      .send({ name: 'Con referencias' })
      .expect(201);
    const id: string = created.body.data.id;
    const references = `/templates/${id}/style-references`;
    const add = (revision: string) =>
      request(app.getHttpServer())
        .post(references)
        .field('expectedRevisionId', revision)
        .attach('image', png, { filename: 'ref.png', contentType: 'image/png' });
    const first = await add(created.body.data.currentRevision.id).expect(201);
    const second = await add(first.body.data.currentRevision.id).expect(201);
    const [a, b] = second.body.data.currentRevision.design.styleReferenceAssetIds;
    expect(second.body.data.currentRevision.number).toBe(3);
    expect([a, b].every(Boolean)).toBe(true);
    const limit = await add(second.body.data.currentRevision.id).expect(409);
    expect(limit.body.error.code).toBe('TEMPLATE_STYLE_REFERENCE_LIMIT');
    await add(first.body.data.currentRevision.id).expect(409);
    const read = await request(app.getHttpServer()).get(`${references}/${a}`).expect(200);
    expect(read.body).toEqual(png);
    const removed = await request(app.getHttpServer())
      .delete(`${references}/${a}`)
      .query({ expectedRevisionId: second.body.data.currentRevision.id })
      .expect(200);
    expect(removed.body.data.currentRevision.design.styleReferenceAssetIds).toEqual([b]);
    // La revisión anterior la sigue usando: el archivo queda legible.
    await request(app.getHttpServer()).get(`${references}/${a}`).expect(200);
  });

  it('uploads one real image and exposes a private API read URL', async () => {
    const f = await fixture();
    const response = await upload(f.productId).expect(201);
    expect(response.body.data.imageAssetIds).toHaveLength(1);
    expect(response.body.data.image).toEqual({ photoType: 'CUTOUT', hasTransparency: false });
    const cutout = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 200, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="64" height="64"><circle cx="32" cy="32" r="20" fill="#c00"/></svg>',
          ),
        },
      ])
      .png()
      .toBuffer();
    const transparent = await upload(f.productId, cutout).expect(201);
    expect(transparent.body.data.image).toEqual({ photoType: 'CUTOUT', hasTransparency: true });
    const url = response.body.data.imageUrl;
    const read = await request(app.getHttpServer()).get(url).expect(200);
    expect(read.body).toEqual(png);
    expect(read.headers['content-type']).toMatch(/^image\/png/);
    expect(read.headers['cache-control']).toBe('private, no-store');
    expect(read.headers['x-content-type-options']).toBe('nosniff');
    const row = await context.database.productImageAsset.findUniqueOrThrow({
      where: { id: response.body.data.imageAssetIds[0] },
    });
    expect(
      (await fetch(`${process.env.TEST_STORAGE_ENDPOINT}/${bucket}/${row.objectKey}`)).status,
    ).toBe(403);
    catalog.organizationId = uuid();
    await request(app.getHttpServer()).get(url).expect(404);
    await upload(f.productId).expect(404);
  });

  it('rejects empty, damaged, excessive and multiple uploads without replacing the image', async () => {
    const f = await fixture();
    const saved = await upload(f.productId).expect(201);
    await request(app.getHttpServer()).post(`/products/${f.productId}/image`).expect(400);
    for (const bytes of [Buffer.from('<html>bad</html>'), png.subarray(0, 100), Buffer.alloc(0)])
      await upload(f.productId, bytes).expect(400);
    await upload(f.productId, Buffer.alloc(10 * 1024 * 1024 + 1)).expect(413);
    await request(app.getHttpServer())
      .post(`/products/${f.productId}/image`)
      .field('photoType', 'CUTOUT')
      .attach('image', png, 'one.png')
      .attach('image', png, 'two.png')
      .expect(400);
    // Sin tipo de foto, o con uno que no existe, no se guarda.
    await request(app.getHttpServer())
      .post(`/products/${f.productId}/image`)
      .attach('image', png, 'photo.png')
      .expect(400);
    await upload(f.productId, png, 'ESTUDIO').expect(400);
    expect(
      (await request(app.getHttpServer()).get(`/products/${f.productId}`).expect(200)).body.data
        .imageAssetIds,
    ).toEqual(saved.body.data.imageAssetIds);
  });

  it('keeps the snapshot image after replacing the product photo', async () => {
    const f = await fixture();
    const first = await upload(f.productId).expect(201);
    const campaign = await context.module.get(CreateCampaign).execute({
      ...f.selection,
      productId: f.productId,
      templateId: f.campaign.templateId,
      templateRevisionId: f.campaign.templateRevisionId,
      title: 'Imagen fijada',
      cta: 'Comprar',
    });
    await context.module
      .get(RequestCampaignGeneration)
      .execute({ organizationId: f.selection.organizationId, campaignId: campaign.id });
    const stored = (await context.campaigns.findById(
      f.selection.organizationId,
      entityId(campaign.id),
    ))!;
    const alternate = await sharp(png).negate().png().toBuffer();
    const second = await upload(f.productId, alternate).expect(201);
    expect(second.body.data.imageAssetIds).toHaveLength(1);
    expect(second.body.data.imageAssetIds).not.toEqual(first.body.data.imageAssetIds);
    const result = await request(app.getHttpServer()).get(`/campaigns/${campaign.id}`).expect(200);
    expect(result.body.data.productImageUrl).toBe(first.body.data.imageUrl);
    const scope = {
      organizationId: f.selection.organizationId,
      campaignId: entityId(campaign.id),
      generationId: stored.generation!.id,
      operationId: uuid(),
    };
    const source = await context.module.get(StoredProductImageSource).load({
      ...scope,
      productId: f.productId,
      imageAssetId: stored.generation!.snapshot.data.product.imageAssetIds[0],
    });
    expect(await artifacts.read({ ...scope, source })).toEqual(png);
    expect(
      (await request(app.getHttpServer()).get(second.body.data.imageUrl).expect(200)).body,
    ).toEqual(alternate);
    await request(app.getHttpServer()).get(first.body.data.imageUrl).expect(200);
    await expect(
      context.module.get(StoredProductImageSource).load({
        ...scope,
        productId: uuid(),
        imageAssetId: entityId(first.body.data.imageAssetIds[0]),
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_IMAGE_REQUIRED' });
  });

  it('prevents stale writes from losing a newer image or commercial changes', async () => {
    const f = await fixture();
    const saved = await upload(f.productId).expect(201);
    const images = context.module.get<ProductImages>(PRODUCT_IMAGES);
    await expect(
      images.save({
        organizationId: f.selection.organizationId,
        productId: f.productId,
        assetId: uuid(),
        bytes: png,
        photoType: PhotoType.STUDIO,
        expectedUpdatedAt: new Date(0),
        at: new Date(),
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(
      (await request(app.getHttpServer()).get(`/products/${f.productId}`).expect(200)).body.data
        .imageAssetIds,
    ).toEqual(saved.body.data.imageAssetIds);
  });

  it('normalizes a phone photo orientation before storing it', async () => {
    const f = await fixture();
    const phonePhoto = await sharp(png).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const saved = await upload(f.productId, phonePhoto).expect(201);
    const read = await request(app.getHttpServer()).get(saved.body.data.imageUrl).expect(200);
    expect(read.headers['content-type']).toMatch(/^image\/jpeg/);
    const metadata = await sharp(read.body).metadata();
    expect(metadata.width).toBe(640);
    expect(metadata.height).toBe(480);
    expect(metadata.orientation ?? 1).toBe(1);
  });

  it('detects corruption in storage rather than returning changed bytes', async () => {
    const f = await fixture();
    const saved = await upload(f.productId).expect(201);
    const row = await context.database.productImageAsset.findUniqueOrThrow({
      where: { id: saved.body.data.imageAssetIds[0] },
    });
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: row.objectKey, Body: Buffer.from('tampered') }),
    );
    await request(app.getHttpServer()).get(saved.body.data.imageUrl).expect(503);
  });
});
