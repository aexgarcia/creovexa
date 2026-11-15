import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG, readDatabaseConfig } from '#app/config/database.config';
import { STORAGE_CONFIG, type StorageConfig } from '#app/config/storage.config';
import { IMAGE_GENERATION_CONFIG } from '#app/config/image-generation.config';
import {
  IMAGE_GENERATOR,
  type ImageGenerator,
} from '#app/modules/content-generation/application/ports/image-generator';
import { CATALOG_HTTP_CONFIG, type CatalogHttpConfig } from '#app/config/catalog-http.config';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { HTTP_LOGGER } from '#app/presentation/http/http-logging';
import { JOB_QUEUE } from '#app/application/ports/job-queue';
import { JOBS_CONFIG } from '#app/config/jobs.config';
import { JobQueueFake } from './job-queue-fake.js';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { entityId } from '#app/domain/entity-id';
import { CreateOrganization } from '#app/modules/organizations/application/use-cases/create-organization';
import { CreateProduct } from '#app/modules/products/application/use-cases/create-product';
import { CreateTemplate } from '#app/modules/templates/application/use-cases/create-template';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaCampaignImageRepository } from '#app/modules/content-generation/infrastructure/persistence/prisma/prisma-campaign-image.repository';
import { CAMPAIGN_GENERATIONS, type CampaignGenerations } from '#app/modules/campaigns/contract';
import type { CampaignImageLease } from '#app/modules/content-generation/application/ports/campaign-image-repository';
import type { StoredCampaignAsset } from '#app/modules/content-generation/application/ports/storage-provider';

export const uuid = () => entityId(randomUUID());
export class ImagePersistenceContext {
  module!: TestingModule;
  database!: PrismaService;
  campaigns!: PrismaCampaignRepository;
  images!: PrismaCampaignImageRepository;
  generations!: CampaignGenerations;
  readonly queue = new JobQueueFake();

  async init(options?: {
    storage: StorageConfig;
    catalog?: CatalogHttpConfig;
    artifacts?: LocalImageArtifacts;
    imageGenerator?: ImageGenerator;
  }) {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema) || config.schema !== schema)
      throw new Error('Usa el runner de integración con un esquema aislado.');
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(IMAGE_GENERATION_CONFIG)
      .useValue({ provider: 'disabled' })
      .overrideProvider(JOB_QUEUE)
      .useValue(this.queue)
      .overrideProvider(JOBS_CONFIG)
      .useValue({ worker: true });
    if (options) {
      if (options.imageGenerator)
        builder.overrideProvider(IMAGE_GENERATOR).useValue(options.imageGenerator);
      builder.overrideProvider(HTTP_LOGGER).useValue({ log() {}, error() {} });
      builder.overrideProvider(STORAGE_CONFIG).useValue(options.storage);
      if (options.catalog) builder.overrideProvider(CATALOG_HTTP_CONFIG).useValue(options.catalog);
      if (options.artifacts)
        builder.overrideProvider(LocalImageArtifacts).useValue(options.artifacts);
    }
    this.module = await builder.compile();
    await this.module.init();
    this.database = this.module.get(PrismaService);
    this.campaigns = this.module.get(PrismaCampaignRepository);
    this.generations = this.module.get<CampaignGenerations>(CAMPAIGN_GENERATIONS);
    this.images = new PrismaCampaignImageRepository(this.database, this.generations);
  }

  async close() {
    await this.module?.close();
  }

  async fixture(withCopy = true) {
    const org = await this.module.get(CreateOrganization).execute({ name: 'Imágenes' });
    const organizationId = entityId(org.id);
    const product = await this.module.get(CreateProduct).execute({
      organizationId,
      kind: ProductKind.PRODUCT,
      name: 'Mouse',
      regularPrice: { amountMinor: 15000, currency: 'PEN' },
      imageAssetIds: [uuid()],
    });
    const template = await this.module.get(CreateTemplate).execute({
      organizationId,
      name: 'Cuadrada',
    });
    const draft = await this.module.get(CreateCampaign).execute({
      organizationId,
      productId: entityId(product.id),
      templateId: entityId(template.id),
      templateRevisionId: entityId(template.currentRevision.id),
      title: 'Mouse gamer',
      instructions: '',
      cta: 'Comprar',
    });
    const selection = { organizationId, campaignId: entityId(draft.id) };
    const result = await this.module.get(RequestCampaignGeneration).execute(selection);
    const generationId = entityId(result.generation!.id);
    const campaign = (await this.campaigns.findById(organizationId, selection.campaignId))!;
    const copy = {
      headline: 'Mejora tu juego',
      caption: 'Control preciso.',
      cta: 'Comprar',
      hashtags: ['#gaming'],
      imagePrompt: 'Mouse sobre escritorio',
    };
    if (withCopy)
      await this.database.campaignCopy.create({
        data: {
          ...selection,
          generationId,
          token: uuid(),
          expiresAt: new Date(),
          status: 'READY',
          content: copy,
        },
      });
    const lease: CampaignImageLease = {
      ...selection,
      generationId,
      token: uuid(),
      expectedVersion: campaign.version,
      now: new Date(),
      expiresAt: new Date(Date.now() + 300_000),
    };
    const completion = (baseAsset: StoredCampaignAsset, finalAsset: StoredCampaignAsset) => ({
      copy: {
        headline: copy.headline,
        // El copy guardado es anterior al subtítulo: se confirma sin él.
        subheadline: null,
        caption: copy.caption,
        cta: copy.cta,
        hashtags: copy.hashtags,
      },
      baseAsset,
      finalAsset,
    });
    return { lease, campaign, copy, selection, completion };
  }

  async stored(
    lease: CampaignImageLease,
    purpose: StoredCampaignAsset['purpose'],
  ): Promise<StoredCampaignAsset> {
    const data = {
      id: uuid(),
      organizationId: lease.organizationId,
      campaignId: lease.campaignId,
      generationId: lease.generationId,
      purpose,
      contentType: 'image/png' as const,
      width: 1080,
      height: 1080,
    };
    await this.database.campaignAsset.create({
      data: {
        ...data,
        operationId: lease.token,
        bucket: 'fixture-assets',
        objectKey: uuid(),
        sha256: 'a'.repeat(64),
        byteLength: 100,
      },
    });
    return data;
  }
}
