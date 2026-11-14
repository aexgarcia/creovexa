import { ConsoleLogger, Module } from '@nestjs/common';
import {
  IMAGE_GENERATION_CONFIG,
  imageGenerationConfigProvider,
  type ImageGenerationConfig,
} from '#app/config/image-generation.config';
import { IMAGE_GENERATOR } from '#app/modules/campaigns/application/ports/image-generator';
import type { ImageGenerator } from '#app/modules/campaigns/application/ports/image-generator';
import type { TemplateRenderer } from '#app/modules/campaigns/application/ports/template-renderer';
import {
  CAMPAIGN_FINAL_ASSETS,
  type CampaignFinalAssets,
} from '#app/modules/campaigns/application/ports/campaign-final-assets';
import { GetCampaignFinalAsset } from '#app/modules/campaigns/application/use-cases/get-campaign-final-asset';
import { GenerateCampaignImage } from '#app/modules/campaigns/application/use-cases/generate-campaign-image';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaCampaignCopyRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-copy.repository';
import { PrismaCampaignImageRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-image.repository';
import { StoredProductImageSource } from '#app/modules/campaigns/infrastructure/stored-product-image-source';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { RuntimeModule, CLOCK, ID_GENERATOR } from './runtime.module.js';
import { GeminiImageGenerator } from '#app/modules/campaigns/infrastructure/gemini-image-generator';
import { OpenAIImageGenerator } from '#app/modules/campaigns/infrastructure/openai-image-generator';
import { LocalImageArtifacts } from '#app/modules/campaigns/infrastructure/local-image-artifacts';
import { STORAGE_CONFIG, type StorageConfig } from '#app/config/storage.config';
import {
  RENDERER_CONFIG,
  rendererConfigProvider,
  type RendererConfig,
} from '#app/config/renderer.config';
import {
  CAMPAIGN_RENDER_RESOURCES,
  type CampaignRenderResources,
} from '#app/modules/campaigns/application/ports/campaign-render-resources';
import { TEMPLATE_RENDERER } from '#app/modules/campaigns/application/ports/template-renderer';
import { PlaywrightTemplateRenderer } from '#app/modules/campaigns/infrastructure/playwright-template-renderer';
import { MinioStorageProvider } from '#app/modules/campaigns/infrastructure/minio-storage-provider';
import { PrismaCampaignRenderResources } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-render-resources';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { ProductImagesModule } from './product-images.module.js';
import { OrganizationLogosModule } from './organization-logos.module.js';
import {
  ORGANIZATION_LOGOS,
  type OrganizationLogos,
} from '#app/modules/organizations/application/ports/organization-logos';

@Module({
  imports: [ProductImagesModule, OrganizationLogosModule, DatabaseModule, RuntimeModule],
  providers: [
    { provide: CAMPAIGN_FINAL_ASSETS, useExisting: MinioStorageProvider },
    {
      provide: GetCampaignFinalAsset,
      inject: [PrismaService, CAMPAIGN_FINAL_ASSETS],
      useFactory: (db: PrismaService, assets: CampaignFinalAssets) =>
        new GetCampaignFinalAsset(new PrismaCampaignRepository(db), assets),
    },
    {
      provide: GenerateCampaignImage,
      inject: [
        PrismaService,
        StoredProductImageSource,
        IMAGE_GENERATOR,
        TEMPLATE_RENDERER,
        MinioStorageProvider,
        ID_GENERATOR,
        CLOCK,
      ],
      useFactory: (
        db: PrismaService,
        source: StoredProductImageSource,
        generator: ImageGenerator,
        renderer: TemplateRenderer,
        storage: MinioStorageProvider,
        ids: IdGenerator,
        clock: Clock,
      ) =>
        new GenerateCampaignImage(
          new PrismaCampaignRepository(db),
          new PrismaCampaignCopyRepository(db),
          new PrismaCampaignImageRepository(db),
          source,
          generator,
          renderer,
          storage,
          ids,
          clock,
        ),
    },
    imageGenerationConfigProvider,
    rendererConfigProvider,
    {
      provide: MinioStorageProvider,
      inject: [PrismaService, LocalImageArtifacts, STORAGE_CONFIG],
      useFactory: (
        db: PrismaService,
        artifacts: LocalImageArtifacts,
        config: StorageConfig | null,
      ) => new MinioStorageProvider(db, artifacts, config),
    },
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
  ],
  exports: [
    IMAGE_GENERATOR,
    TEMPLATE_RENDERER,
    MinioStorageProvider,
    CAMPAIGN_FINAL_ASSETS,
    GetCampaignFinalAsset,
    GenerateCampaignImage,
  ],
})
export class CampaignImageModule {}
