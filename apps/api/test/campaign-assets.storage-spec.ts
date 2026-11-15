import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { entityId } from '#app/domain/entity-id';
import { FlyerDesign } from '#app/domain/value-objects/flyer-design';
import {
  IMAGE_GENERATOR,
  type ImageGenerator,
} from '#app/modules/content-generation/application/ports/image-generator';
import {
  CAMPAIGN_RENDER_RESOURCES,
  type CampaignRenderResources,
} from '#app/modules/content-generation/application/ports/campaign-render-resources';
import {
  TEMPLATE_RENDERER,
  type TemplateRenderer,
  type RenderCampaignTemplateInput,
} from '#app/modules/content-generation/application/ports/template-renderer';
import { UpdateTemplate } from '#app/modules/templates/application/use-cases/update-template';
import { readStorageConfig } from '#app/config/storage.config';
import { S3ObjectStorage } from '#app/modules/assets/infrastructure/s3-object-storage';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { MinioStorageProvider } from '#app/modules/content-generation/infrastructure/minio-storage-provider';
import { GenerateCampaignImage } from '#app/modules/content-generation/application/use-cases/generate-campaign-image';
import { PrismaCampaignCopyRepository } from '#app/modules/content-generation/infrastructure/persistence/prisma/prisma-campaign-copy.repository';
import type { StoreCampaignAssetInput } from '#app/modules/content-generation/application/ports/storage-provider';
import { ImagePersistenceContext, uuid } from './support/image-persistence-context.js';
import { composedRenderExtras } from './support/generation-fakes.js';

describe('Private campaign assets (MinIO + PostgreSQL)', () => {
  const context = new ImagePersistenceContext();
  const bucket = 'creovexa-test-' + randomUUID().replaceAll('-', '');
  let client: S3Client;
  let storage: MinioStorageProvider;
  let objects: S3ObjectStorage;
  let artifacts: LocalImageArtifacts;
  let directory: string;
  let created = false;
  let png: Buffer;

  beforeAll(async () => {
    const config = readStorageConfig({
      STORAGE_ENDPOINT: process.env.TEST_STORAGE_ENDPOINT,
      STORAGE_BUCKET: bucket,
      STORAGE_ACCESS_KEY: process.env.TEST_STORAGE_ACCESS_KEY,
      STORAGE_SECRET_KEY: process.env.TEST_STORAGE_SECRET_KEY,
    });
    directory = await mkdtemp(join(tmpdir(), 'creovexa-image-test-'));
    artifacts = new LocalImageArtifacts(directory);
    await context.init({ storage: config, artifacts });
    objects = new S3ObjectStorage(config);
    storage = new MinioStorageProvider(context.database, artifacts, objects, context.generations);
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    created = true;
    png = await sharp({ create: { width: 1080, height: 1080, channels: 3, background: '#152241' } })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    try {
      if (created && /^creovexa-test-[0-9a-f]{32}$/.test(bucket)) {
        const objects = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
        for (const object of objects.Contents ?? [])
          await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
        await client.send(new DeleteBucketCommand({ Bucket: bucket }));
      }
    } finally {
      client?.destroy();
      objects?.close();
      await context.close();
      if (directory && resolve(directory).startsWith(resolve(tmpdir()) + '\\creovexa-image-test-'))
        await rm(directory, { recursive: true });
      else if (
        directory &&
        resolve(directory).startsWith(resolve(tmpdir()) + '/creovexa-image-test-')
      )
        await rm(directory, { recursive: true });
    }
  });

  async function fixture(bytes = png) {
    const f = await context.fixture();
    await context.images.claim(f.lease);
    const scope = {
      ...f.selection,
      generationId: f.lease.generationId,
      operationId: f.lease.token,
    };
    const reference = await artifacts.write(scope, bytes);
    const input: StoreCampaignAssetInput = {
      ...scope,
      purpose: 'BASE_IMAGE',
      source: { reference, width: 1080, height: 1080, contentType: 'image/png' },
    };
    return { ...f, input };
  }

  it('injects visual AI as disabled independently of the configured catalog storage', () => {
    const generator = context.module.get<ImageGenerator>(IMAGE_GENERATOR);
    expect(() => generator.assertAvailable()).toThrow('UNAVAILABLE');
    expect(() => storage.assertAvailable()).not.toThrow();
  });

  async function renderFixture() {
    const f = await fixture();
    const base = await storage.store(f.input);
    const input: RenderCampaignTemplateInput = {
      ...f.input,
      mainImage: base.id,
      snapshot: f.campaign.generation!.snapshot.data,
      copy: f.copy,
      ...composedRenderExtras(f.campaign.generation!.snapshot.data, f.input.source),
    };
    const resources = context.module.get<CampaignRenderResources>(CAMPAIGN_RENDER_RESOURCES);
    return { ...f, assetInput: f.input, input, base, resources };
  }

  it('loads the frozen design and owned image after the template is edited', async () => {
    const f = await renderFixture();
    const revision = f.input.snapshot.template;
    await context.module.get(UpdateTemplate).execute({
      organizationId: f.input.organizationId,
      templateId: revision.id,
      expectedRevisionId: revision.revisionId,
      name: 'Nombre actualizado',
      design: { ...FlyerDesign.create().data, composition: 'PRODUCT_PANEL', mode: 'LIGHT' },
    });
    const result = await f.resources.load(f.input);
    expect(result.mainImage.bytes).toEqual(png);
    expect(result.logo).toBeNull();
    expect(result.design).toEqual(FlyerDesign.create().data);
    const current = await context.database.templateRevision.findFirstOrThrow({
      where: { templateId: revision.id, number: 2n },
    });
    expect(current.design).toMatchObject({ composition: 'PRODUCT_PANEL', mode: 'LIGHT' });
    // El diseño sale del snapshot; una plantilla de otra organización no se acepta.
    await expect(
      f.resources.load({
        ...f.input,
        snapshot: {
          ...f.input.snapshot,
          template: { ...revision, organizationId: entityId(uuid()) },
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });

  it('rejects foreign base assets and the final piece as rendering inputs', async () => {
    const f = await renderFixture();
    const foreign = await renderFixture();
    await expect(
      f.resources.load({ ...f.input, mainImage: foreign.base.id }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    const final = await storage.store({
      ...f.input,
      purpose: 'FINAL_PIECE',
      source: f.assetInput.source,
    });
    await expect(f.resources.load({ ...f.input, mainImage: final.id })).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
  });

  it('rejects a prior attempt image even with an active new lease for the same generation', async () => {
    const f = await renderFixture();
    await context.images.release(f.lease);
    const lease = { ...f.lease, token: uuid() };
    expect(await context.images.claim(lease)).toBe(true);
    await expect(f.resources.load({ ...f.input, operationId: lease.token })).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
  });

  it('does not load a render after lease expiration', async () => {
    const f = await renderFixture();
    await context.database.campaignImageJob.update({
      where: { generationId: f.input.generationId },
      data: { expiresAt: new Date(0) },
    });
    await expect(f.resources.load(f.input)).rejects.toMatchObject({ code: 'STALE_RESULT' });
  });

  it('refuses to omit a referenced logo that cannot be read within its organization', async () => {
    const f = await renderFixture();
    await expect(
      f.resources.load({
        ...f.input,
        snapshot: {
          ...f.input.snapshot,
          organization: { ...f.input.snapshot.organization, logoAssetId: uuid() },
        },
      }),
    ).rejects.toMatchObject({ code: 'LOGO_UNAVAILABLE' });
  });

  it('renders and commits a final piece using real Chromium, PostgreSQL and MinIO', async () => {
    const f = await context.fixture();
    const produce = vi.fn(async (input: Parameters<LocalImageArtifacts['write']>[0]) => ({
      reference: await artifacts.write(input, png),
      width: 1080,
      height: 1080,
      contentType: 'image/png' as const,
    }));
    const renderer = context.module.get<TemplateRenderer>(TEMPLATE_RENDERER);
    const useCase = new GenerateCampaignImage(
      context.generations,
      new PrismaCampaignCopyRepository(context.database, context.generations),
      context.images,
      { assertAvailable() {}, load: produce },
      { assertAvailable() {}, generate: produce },
      renderer,
      storage,
      { next: uuid },
      { now: () => new Date() },
    );
    const input = { ...f.selection, generationId: f.lease.generationId };
    const content = await useCase.execute(input);
    const result = await storage.read(input.organizationId, content.assetIds[0]);
    expect(result?.asset).toMatchObject({
      purpose: 'FINAL_PIECE',
      width: 1080,
      height: 1080,
      contentType: 'image/png',
    });
    expect(result?.bytes.equals(png)).toBe(false);
    expect((await context.campaigns.findById(input.organizationId, input.campaignId))?.status).toBe(
      'PENDING_APPROVAL',
    );
    expect((await useCase.execute(input)).id).toBe(content.id);
    expect(produce).toHaveBeenCalledTimes(2);
  });

  it('stores real bytes privately, reads only for the owner and replays the same asset', async () => {
    const { input } = await fixture();
    const [asset, replay] = await Promise.all([storage.store(input), storage.store(input)]);
    expect(replay.id).toBe(asset.id);
    expect((await storage.read(input.organizationId, asset.id))?.bytes).toEqual(png);
    expect(await storage.read(uuid(), asset.id)).toBeNull();
    const row = await context.database.campaignAsset.findUniqueOrThrow({ where: { id: asset.id } });
    const endpoint = process.env.TEST_STORAGE_ENDPOINT!;
    expect((await fetch(`${endpoint}/${bucket}/${row.objectKey}`)).status).toBe(403);
  });

  it('does not overwrite an operation with different bytes', async () => {
    const { input } = await fixture();
    const asset = await storage.store(input);
    const other = await sharp(png).negate().png().toBuffer();
    const reference = await artifacts.write(input, other);
    await expect(
      storage.store({ ...input, source: { ...input.source, reference } }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect((await storage.read(input.organizationId, asset.id))?.bytes).toEqual(png);
  });

  it('recovers an uploaded object after metadata persistence failed', async () => {
    const { input } = await fixture();
    const asset = await storage.store(input);
    await context.database.campaignAsset.delete({ where: { id: asset.id } });
    const recovered = await storage.store(input);
    expect((await storage.read(input.organizationId, recovered.id))?.bytes).toEqual(png);
  });

  it.each(['html', 'truncated', 'mime', 'dimensions', 'path', 'foreign-operation'])(
    'rejects invalid source: %s',
    async (kind) => {
      const f = await fixture(
        kind === 'html'
          ? Buffer.from('<html>bad</html>')
          : kind === 'truncated'
            ? png.subarray(0, 100)
            : png,
      );
      const input = { ...f.input, source: { ...f.input.source } };
      if (kind === 'mime') input.source.contentType = 'image/jpeg';
      if (kind === 'dimensions') input.source.width = 20;
      if (kind === 'path') input.source.reference = '../../.env';
      if (kind === 'foreign-operation') input.operationId = uuid();
      await expect(storage.store(input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
      expect(
        await context.database.campaignAsset.count({ where: { generationId: input.generationId } }),
      ).toBe(0);
    },
  );

  it('refuses new storage after the lease has expired', async () => {
    const { input, lease } = await fixture();
    await context.database.campaignImageJob.update({
      where: { generationId: lease.generationId },
      data: { expiresAt: new Date(0) },
    });
    await expect(storage.store(input)).rejects.toMatchObject({ code: 'STALE_RESULT' });
  });

  it('rejects changed bytes when recovering an object without metadata', async () => {
    const { input } = await fixture();
    const asset = await storage.store(input);
    const row = await context.database.campaignAsset.delete({ where: { id: asset.id } });
    const reference = await artifacts.write(input, await sharp(png).negate().png().toBuffer());
    await expect(
      storage.store({ ...input, source: { ...input.source, reference } }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: row.objectKey }));
    expect(Buffer.from(await object.Body!.transformToByteArray())).toEqual(png);
  });

  it('completes the use case with real storage and persistence, then replays without generation', async () => {
    const f = await context.fixture();
    const creativeBytes = await sharp(png).negate().png().toBuffer();
    const produce = vi.fn(async (input: Parameters<LocalImageArtifacts['write']>[0]) => ({
      reference: await artifacts.write(input, png),
      width: 1080,
      height: 1080,
      contentType: 'image/png' as const,
    }));
    const generate = vi.fn(async (input: Parameters<LocalImageArtifacts['write']>[0]) => ({
      reference: await artifacts.write(input, creativeBytes),
      width: 1080,
      height: 1080,
      contentType: 'image/png' as const,
    }));
    const useCase = new GenerateCampaignImage(
      context.generations,
      new PrismaCampaignCopyRepository(context.database, context.generations),
      context.images,
      { assertAvailable() {}, load: produce },
      { assertAvailable() {}, generate },
      {
        assertAvailable() {},
        supports: () => true,
        render: async (input) => ({
          final: await produce(input),
          areaUnderLogo: null,
          logoPlacement: null,
        }),
      },
      storage,
      { next: uuid },
      { now: () => new Date() },
    );
    const input = { ...f.selection, generationId: f.lease.generationId };
    const result = await useCase.execute(input);
    expect((await useCase.execute(input)).id).toBe(result.id);
    expect(produce).toHaveBeenCalledTimes(2);
    expect(generate).toHaveBeenCalledTimes(1);
    const base = await context.database.campaignAsset.findFirstOrThrow({
      where: { generationId: input.generationId, purpose: 'BASE_IMAGE' },
    });
    expect((await storage.read(input.organizationId, entityId(base.id)))?.bytes).toEqual(
      creativeBytes,
    );
    expect((await context.campaigns.findById(input.organizationId, input.campaignId))?.status).toBe(
      'PENDING_APPROVAL',
    );
    expect((await storage.read(input.organizationId, result.assetIds[0]))?.bytes).toEqual(png);
  });
});
