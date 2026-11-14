import { resolve } from 'node:path';
import { ConsoleLogger, Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import {
  COPY_GENERATION_CONFIG,
  copyGenerationConfigProvider,
  type CopyGenerationConfig,
} from '#app/config/copy-generation.config';
import {
  IMAGE_GENERATION_CONFIG,
  imageGenerationConfigProvider,
  type ImageGenerationConfig,
} from '#app/config/image-generation.config';
import {
  RENDERER_CONFIG,
  rendererConfigProvider,
  type RendererConfig,
} from '#app/config/renderer.config';
import { STORAGE_CONFIG, type StorageConfig } from '#app/config/storage.config';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { RuntimeModule, CLOCK, ID_GENERATOR } from '#app/infrastructure/runtime.module';
import { StorageModule } from '#app/infrastructure/storage.module';
import {
  ORGANIZATION_LOGOS,
  type OrganizationLogos,
} from '#app/modules/organizations/application/ports/organization-logos';
import { OrganizationsModule } from '#app/modules/organizations/organizations.module';
import {
  PRODUCT_IMAGES,
  type ProductImages,
} from '#app/modules/products/application/ports/product-images';
import { ProductsModule } from '#app/modules/products/products.module';
import {
  CAMPAIGN_FINAL_ASSETS,
  type CampaignFinalAssets,
} from './application/ports/campaign-final-assets.js';
import {
  CAMPAIGN_RENDER_RESOURCES,
  type CampaignRenderResources,
} from './application/ports/campaign-render-resources.js';
import { COPY_GENERATOR, type CopyGenerator } from './application/ports/copy-generator.js';
import { IMAGE_GENERATOR, type ImageGenerator } from './application/ports/image-generator.js';
import { TEMPLATE_RENDERER, type TemplateRenderer } from './application/ports/template-renderer.js';
import { ApproveCampaign } from './application/use-cases/approve-campaign.js';
import { CreateCampaign } from './application/use-cases/create-campaign.js';
import {
  GenerateCampaignCopy,
  GetCampaignCopy,
} from './application/use-cases/generate-campaign-copy.js';
import { GenerateCampaignImage } from './application/use-cases/generate-campaign-image.js';
import { GetCampaign } from './application/use-cases/get-campaign.js';
import { GetCampaignFinalAsset } from './application/use-cases/get-campaign-final-asset.js';
import { ListCampaigns } from './application/use-cases/list-campaigns.js';
import { RecordCampaignGenerationFailure } from './application/use-cases/record-campaign-generation-failure.js';
import { RecordGeneratedCampaign } from './application/use-cases/record-generated-campaign.js';
import { RequestCampaignGeneration } from './application/use-cases/request-campaign-generation.js';
import { RequestCampaignRegeneration } from './application/use-cases/request-campaign-regeneration.js';
import { GeminiCopyGenerator } from './infrastructure/gemini-copy-generator.js';
import { GeminiImageGenerator } from './infrastructure/gemini-image-generator.js';
import { LocalImageArtifacts } from './infrastructure/local-image-artifacts.js';
import { MinioStorageProvider } from './infrastructure/minio-storage-provider.js';
import { OpenAICopyGenerator } from './infrastructure/openai-copy-generator.js';
import { OpenAIImageGenerator } from './infrastructure/openai-image-generator.js';
import { PrismaCampaignCopyRepository } from './infrastructure/persistence/prisma/prisma-campaign-copy.repository.js';
import { PrismaCampaignImageRepository } from './infrastructure/persistence/prisma/prisma-campaign-image.repository.js';
import { PrismaCampaignLookups } from './infrastructure/persistence/prisma/prisma-campaign-lookups.js';
import { PrismaCampaignRenderResources } from './infrastructure/persistence/prisma/prisma-campaign-render-resources.js';
import { PrismaCampaignRepository } from './infrastructure/persistence/prisma/prisma-campaign.repository.js';
import { PlaywrightTemplateRenderer } from './infrastructure/playwright-template-renderer.js';
import { StoredProductImageSource } from './infrastructure/stored-product-image-source.js';
import { CampaignCopyController } from './presentation/campaign-copy.controller.js';
import { CampaignImageController } from './presentation/campaign-image.controller.js';
import { CampaignsController } from './presentation/campaigns.controller.js';

@Module({
  imports: [
    DatabaseModule,
    RuntimeModule,
    StorageModule,
    HttpCommonModule,
    OrganizationsModule,
    ProductsModule,
  ],
  controllers: [CampaignsController, CampaignCopyController, CampaignImageController],
  providers: [
    copyGenerationConfigProvider,
    imageGenerationConfigProvider,
    rendererConfigProvider,

    // Persistence
    ...[
      PrismaCampaignRepository,
      PrismaCampaignLookups,
      PrismaCampaignCopyRepository,
      PrismaCampaignImageRepository,
    ].map((Repository) => ({
      provide: Repository,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new Repository(db),
    })),

    // Campaign lifecycle
    ...[GetCampaign, ListCampaigns].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaCampaignRepository],
      useFactory: (repo: PrismaCampaignRepository) => new UseCase(repo),
    })),
    ...[CreateCampaign, RequestCampaignGeneration, RequestCampaignRegeneration].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaCampaignRepository, PrismaCampaignLookups, ID_GENERATOR, CLOCK],
      useFactory: (
        repo: PrismaCampaignRepository,
        lookups: PrismaCampaignLookups,
        ids: IdGenerator,
        clock: Clock,
      ) => new UseCase(repo, lookups, ids, clock),
    })),
    {
      provide: RecordGeneratedCampaign,
      inject: [PrismaCampaignRepository, ID_GENERATOR, CLOCK],
      useFactory: (repo: PrismaCampaignRepository, ids: IdGenerator, clock: Clock) =>
        new RecordGeneratedCampaign(repo, ids, clock),
    },
    {
      provide: RecordCampaignGenerationFailure,
      inject: [PrismaCampaignRepository, CLOCK],
      useFactory: (repo: PrismaCampaignRepository, clock: Clock) =>
        new RecordCampaignGenerationFailure(repo, clock),
    },
    {
      provide: ApproveCampaign,
      inject: [PrismaCampaignRepository, CLOCK, CAMPAIGN_FINAL_ASSETS],
      useFactory: (repo: PrismaCampaignRepository, clock: Clock, assets: CampaignFinalAssets) =>
        new ApproveCampaign(repo, clock, assets),
    },

    // Copy generation
    {
      provide: COPY_GENERATOR,
      inject: [COPY_GENERATION_CONFIG],
      useFactory: (config: CopyGenerationConfig) =>
        config.provider === 'gemini'
          ? new GeminiCopyGenerator(
              config.settings,
              fetch,
              new ConsoleLogger('CopyGeneration', { json: true }),
            )
          : new OpenAICopyGenerator(
              config.settings,
              fetch,
              new ConsoleLogger('CopyGeneration', { json: true }),
            ),
    },
    {
      provide: GetCampaignCopy,
      inject: [PrismaCampaignRepository, PrismaCampaignCopyRepository],
      useFactory: (campaigns: PrismaCampaignRepository, copies: PrismaCampaignCopyRepository) =>
        new GetCampaignCopy(campaigns, copies),
    },
    {
      provide: GenerateCampaignCopy,
      inject: [
        PrismaCampaignRepository,
        PrismaCampaignLookups,
        PrismaCampaignCopyRepository,
        COPY_GENERATOR,
        ID_GENERATOR,
        CLOCK,
      ],
      useFactory: (
        campaigns: PrismaCampaignRepository,
        lookups: PrismaCampaignLookups,
        copies: PrismaCampaignCopyRepository,
        generator: CopyGenerator,
        ids: IdGenerator,
        clock: Clock,
      ) => new GenerateCampaignCopy(campaigns, lookups, copies, generator, ids, clock),
    },

    // Image generation, composition and campaign assets
    {
      provide: LocalImageArtifacts,
      useFactory: () => new LocalImageArtifacts(resolve('.local/image-artifacts')),
    },
    {
      provide: StoredProductImageSource,
      inject: [PRODUCT_IMAGES, LocalImageArtifacts],
      useFactory: (images: ProductImages, artifacts: LocalImageArtifacts) =>
        new StoredProductImageSource(images, artifacts),
    },
    {
      provide: MinioStorageProvider,
      inject: [PrismaService, LocalImageArtifacts, STORAGE_CONFIG],
      useFactory: (
        db: PrismaService,
        artifacts: LocalImageArtifacts,
        config: StorageConfig | null,
      ) => new MinioStorageProvider(db, artifacts, config),
    },
    { provide: CAMPAIGN_FINAL_ASSETS, useExisting: MinioStorageProvider },
    {
      provide: CAMPAIGN_RENDER_RESOURCES,
      inject: [PrismaService, MinioStorageProvider, ORGANIZATION_LOGOS],
      useFactory: (db: PrismaService, storage: MinioStorageProvider, logos: OrganizationLogos) =>
        new PrismaCampaignRenderResources(db, storage, logos),
    },
    {
      provide: TEMPLATE_RENDERER,
      inject: [CAMPAIGN_RENDER_RESOURCES, LocalImageArtifacts, RENDERER_CONFIG],
      useFactory: (
        resources: CampaignRenderResources,
        artifacts: LocalImageArtifacts,
        config: RendererConfig,
      ) => new PlaywrightTemplateRenderer(resources, artifacts, config),
    },
    {
      provide: IMAGE_GENERATOR,
      inject: [IMAGE_GENERATION_CONFIG, LocalImageArtifacts],
      useFactory: (config: ImageGenerationConfig, artifacts: LocalImageArtifacts) =>
        config.provider === 'openai'
          ? new OpenAIImageGenerator(
              config.settings,
              artifacts,
              fetch,
              new ConsoleLogger('ImageGeneration', { json: true }),
            )
          : new GeminiImageGenerator(
              config.provider === 'gemini' ? config.settings : null,
              artifacts,
              fetch,
              new ConsoleLogger('ImageGeneration', { json: true }),
            ),
    },
    {
      provide: GetCampaignFinalAsset,
      inject: [PrismaCampaignRepository, CAMPAIGN_FINAL_ASSETS],
      useFactory: (campaigns: PrismaCampaignRepository, assets: CampaignFinalAssets) =>
        new GetCampaignFinalAsset(campaigns, assets),
    },
    {
      provide: GenerateCampaignImage,
      inject: [
        PrismaCampaignRepository,
        PrismaCampaignCopyRepository,
        PrismaCampaignImageRepository,
        StoredProductImageSource,
        IMAGE_GENERATOR,
        TEMPLATE_RENDERER,
        MinioStorageProvider,
        ID_GENERATOR,
        CLOCK,
      ],
      useFactory: (
        campaigns: PrismaCampaignRepository,
        copies: PrismaCampaignCopyRepository,
        images: PrismaCampaignImageRepository,
        source: StoredProductImageSource,
        generator: ImageGenerator,
        renderer: TemplateRenderer,
        storage: MinioStorageProvider,
        ids: IdGenerator,
        clock: Clock,
      ) =>
        new GenerateCampaignImage(
          campaigns,
          copies,
          images,
          source,
          generator,
          renderer,
          storage,
          ids,
          clock,
        ),
    },
  ],
})
export class CampaignsModule {}
