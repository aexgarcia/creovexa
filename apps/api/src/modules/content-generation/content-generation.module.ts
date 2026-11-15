import { resolve } from 'node:path';
import { ConsoleLogger, Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { JOB_QUEUE, type JobQueue } from '#app/application/ports/job-queue';
import { UNIT_OF_WORK, type UnitOfWork } from '#app/application/ports/unit-of-work';
import { JOBS_CONFIG, type JobsConfig } from '#app/config/jobs.config';
import { JobsModule } from '#app/infrastructure/jobs/jobs.module';
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
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { RuntimeModule, CLOCK, ID_GENERATOR } from '#app/infrastructure/runtime.module';
import { AssetsModule } from '#app/modules/assets/assets.module';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import { CampaignsModule } from '#app/modules/campaigns/campaigns.module';
import { CAMPAIGN_GENERATIONS, type CampaignGenerations } from '#app/modules/campaigns/contract';
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
  CAMPAIGN_RENDER_RESOURCES,
  type CampaignRenderResources,
} from './application/ports/campaign-render-resources.js';
import { COPY_GENERATOR, type CopyGenerator } from './application/ports/copy-generator.js';
import { IMAGE_GENERATOR, type ImageGenerator } from './application/ports/image-generator.js';
import { TEMPLATE_RENDERER, type TemplateRenderer } from './application/ports/template-renderer.js';
import { FLYER_LOGO_SOURCE, type FlyerLogoSource } from './application/ports/flyer-logo-source.js';
import { FLYER_READER, type FlyerReader } from './application/ports/flyer-reader.js';
import {
  FLYER_STYLE_SOURCE,
  type FlyerStyleSource,
} from './application/ports/flyer-style-source.js';
import { StoredFlyerStyleSource } from './infrastructure/stored-flyer-style-source.js';
import { TemplatesModule } from '#app/modules/templates/templates.module';
import {
  TEMPLATE_STYLE_REFERENCES,
  type TemplateStyleReferences,
} from '#app/modules/templates/application/ports/template-style-references';
import { LogoOverlayComposer } from './infrastructure/logo-overlay-composer.js';
import { OpenAIFlyerReader } from './infrastructure/openai-flyer-reader.js';
import { StoredFlyerLogoSource } from './infrastructure/stored-flyer-logo-source.js';
import {
  GenerateCampaignCopy,
  GetCampaignCopy,
} from './application/use-cases/generate-campaign-copy.js';
import { GenerateCampaignImage } from './application/use-cases/generate-campaign-image.js';
import { RequestCampaignCopy } from './application/use-cases/request-campaign-copy.js';
import { UpdateCampaignCopy } from './application/use-cases/update-campaign-copy.js';
import {
  GetCampaignImage,
  RequestCampaignImage,
} from './application/use-cases/request-campaign-image.js';
import { GenerationJobs } from './application/generation-jobs.js';
import { GenerationJobRunner } from './infrastructure/generation-job-runner.js';
import { GeminiCopyGenerator } from './infrastructure/gemini-copy-generator.js';
import { GeminiImageGenerator } from './infrastructure/gemini-image-generator.js';
import { LocalImageArtifacts } from './infrastructure/local-image-artifacts.js';
import { MinioStorageProvider } from './infrastructure/minio-storage-provider.js';
import { OpenAICopyGenerator } from './infrastructure/openai-copy-generator.js';
import { OpenAIImageGenerator } from './infrastructure/openai-image-generator.js';
import { PrismaCampaignCopyRepository } from './infrastructure/persistence/prisma/prisma-campaign-copy.repository.js';
import { PrismaCampaignImageRepository } from './infrastructure/persistence/prisma/prisma-campaign-image.repository.js';
import { PrismaCampaignRenderResources } from './infrastructure/persistence/prisma/prisma-campaign-render-resources.js';
import { PlaywrightTemplateRenderer } from './infrastructure/playwright-template-renderer.js';
import { StoredProductImageSource } from './infrastructure/stored-product-image-source.js';
import { CampaignCopyController } from './presentation/campaign-copy.controller.js';
import { CampaignImageController } from './presentation/campaign-image.controller.js';

@Module({
  imports: [
    DatabaseModule,
    RuntimeModule,
    AssetsModule,
    HttpCommonModule,
    JobsModule,
    OrganizationsModule,
    ProductsModule,
    TemplatesModule,
    CampaignsModule,
  ],
  controllers: [CampaignCopyController, CampaignImageController],
  providers: [
    copyGenerationConfigProvider,
    imageGenerationConfigProvider,
    rendererConfigProvider,

    ...[PrismaCampaignCopyRepository, PrismaCampaignImageRepository].map((Repository) => ({
      provide: Repository,
      inject: [PrismaService, CAMPAIGN_GENERATIONS],
      useFactory: (db: PrismaService, generations: CampaignGenerations) =>
        new Repository(db, generations),
    })),

    // Copy
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
      inject: [CAMPAIGN_GENERATIONS, PrismaCampaignCopyRepository, CLOCK],
      useFactory: (
        generations: CampaignGenerations,
        copies: PrismaCampaignCopyRepository,
        clock: Clock,
      ) => new GetCampaignCopy(generations, copies, clock),
    },
    {
      provide: UpdateCampaignCopy,
      inject: [CAMPAIGN_GENERATIONS, PrismaCampaignCopyRepository, CLOCK],
      useFactory: (
        generations: CampaignGenerations,
        copies: PrismaCampaignCopyRepository,
        clock: Clock,
      ) => new UpdateCampaignCopy(generations, copies, clock),
    },
    {
      provide: RequestCampaignCopy,
      inject: [
        CAMPAIGN_GENERATIONS,
        PrismaCampaignCopyRepository,
        COPY_GENERATOR,
        JOB_QUEUE,
        UNIT_OF_WORK,
        CLOCK,
      ],
      useFactory: (
        generations: CampaignGenerations,
        copies: PrismaCampaignCopyRepository,
        generator: CopyGenerator,
        queue: JobQueue,
        transactions: UnitOfWork,
        clock: Clock,
      ) => new RequestCampaignCopy(generations, copies, generator, queue, transactions, clock),
    },
    {
      provide: GenerateCampaignCopy,
      inject: [
        CAMPAIGN_GENERATIONS,
        PrismaCampaignCopyRepository,
        COPY_GENERATOR,
        ID_GENERATOR,
        CLOCK,
      ],
      useFactory: (
        generations: CampaignGenerations,
        copies: PrismaCampaignCopyRepository,
        generator: CopyGenerator,
        ids: IdGenerator,
        clock: Clock,
      ) => new GenerateCampaignCopy(generations, copies, generator, ids, clock),
    },

    // Imagen y composición
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
      inject: [PrismaService, LocalImageArtifacts, OBJECT_STORAGE, CAMPAIGN_GENERATIONS],
      useFactory: (
        db: PrismaService,
        artifacts: LocalImageArtifacts,
        storage: ObjectStorage,
        generations: CampaignGenerations,
      ) => new MinioStorageProvider(db, artifacts, storage, generations),
    },
    {
      provide: CAMPAIGN_RENDER_RESOURCES,
      inject: [PrismaService, MinioStorageProvider, ORGANIZATION_LOGOS],
      useFactory: (db: PrismaService, storage: MinioStorageProvider, logos: OrganizationLogos) =>
        new PrismaCampaignRenderResources(db, storage, logos),
    },
    // El modo se elige al desplegar (ADR-0009): AI_FULL pega el logo y verifica el flyer de la
    // IA; COMPOSED compone los textos con Playwright.
    {
      provide: TEMPLATE_RENDERER,
      inject: [
        IMAGE_GENERATION_CONFIG,
        CAMPAIGN_RENDER_RESOURCES,
        LocalImageArtifacts,
        RENDERER_CONFIG,
      ],
      useFactory: (
        image: ImageGenerationConfig,
        resources: CampaignRenderResources,
        artifacts: LocalImageArtifacts,
        config: RendererConfig,
      ) =>
        image.mode === 'AI_FULL'
          ? new LogoOverlayComposer(artifacts)
          : new PlaywrightTemplateRenderer(resources, artifacts, config),
    },
    {
      provide: FLYER_LOGO_SOURCE,
      inject: [IMAGE_GENERATION_CONFIG, ORGANIZATION_LOGOS, LocalImageArtifacts],
      useFactory: (
        image: ImageGenerationConfig,
        logos: OrganizationLogos,
        artifacts: LocalImageArtifacts,
      ) => (image.mode === 'AI_FULL' ? new StoredFlyerLogoSource(logos, artifacts) : null),
    },
    {
      provide: FLYER_STYLE_SOURCE,
      inject: [IMAGE_GENERATION_CONFIG, TEMPLATE_STYLE_REFERENCES, LocalImageArtifacts],
      useFactory: (
        image: ImageGenerationConfig,
        references: TemplateStyleReferences,
        artifacts: LocalImageArtifacts,
      ) => (image.mode === 'AI_FULL' ? new StoredFlyerStyleSource(references, artifacts) : null),
    },
    {
      provide: FLYER_READER,
      inject: [IMAGE_GENERATION_CONFIG, LocalImageArtifacts],
      useFactory: (image: ImageGenerationConfig, artifacts: LocalImageArtifacts) =>
        // Gemini solo admite COMPOSED y sin proveedor no hay generación que verificar.
        image.provider === 'openai' && image.mode === 'AI_FULL'
          ? new OpenAIFlyerReader(image.settings.apiKey, image.vision, artifacts)
          : null,
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
              config.mode,
            )
          : new GeminiImageGenerator(
              config.provider === 'gemini' ? config.settings : null,
              artifacts,
              fetch,
              new ConsoleLogger('ImageGeneration', { json: true }),
            ),
    },
    {
      provide: GenerateCampaignImage,
      inject: [
        CAMPAIGN_GENERATIONS,
        PrismaCampaignCopyRepository,
        PrismaCampaignImageRepository,
        StoredProductImageSource,
        IMAGE_GENERATOR,
        TEMPLATE_RENDERER,
        MinioStorageProvider,
        ID_GENERATOR,
        CLOCK,
        FLYER_LOGO_SOURCE,
        FLYER_READER,
        LocalImageArtifacts,
        FLYER_STYLE_SOURCE,
      ],
      useFactory: (
        generations: CampaignGenerations,
        copies: PrismaCampaignCopyRepository,
        images: PrismaCampaignImageRepository,
        source: StoredProductImageSource,
        generator: ImageGenerator,
        renderer: TemplateRenderer,
        storage: MinioStorageProvider,
        ids: IdGenerator,
        clock: Clock,
        logos: FlyerLogoSource | null,
        reader: FlyerReader | null,
        artifacts: LocalImageArtifacts,
        styles: FlyerStyleSource | null,
      ) => {
        const logger = new ConsoleLogger('FlyerVerification', { json: true });
        return new GenerateCampaignImage(
          generations,
          copies,
          images,
          source,
          generator,
          renderer,
          storage,
          ids,
          clock,
          {
            logos,
            reader,
            styles,
            // Solo el resultado y las observaciones: nunca textos del prompt ni claves.
            report: (report) =>
              report.verification.ok
                ? logger.log({ event: 'flyer_verified', ...report })
                : logger.warn({ event: 'flyer_verification_failed', ...report }),
            temporary: artifacts,
          },
        );
      },
    },
    {
      // El caso de uso de imagen ya tiene todos los ports que la petición debe revisar.
      provide: RequestCampaignImage,
      inject: [GenerateCampaignImage, PrismaCampaignImageRepository, JOB_QUEUE, UNIT_OF_WORK],
      useFactory: (
        generate: GenerateCampaignImage,
        images: PrismaCampaignImageRepository,
        queue: JobQueue,
        transactions: UnitOfWork,
      ) => new RequestCampaignImage(generate, images, queue, transactions),
    },
    {
      provide: GetCampaignImage,
      inject: [CAMPAIGN_GENERATIONS, PrismaCampaignImageRepository, CLOCK],
      useFactory: (
        generations: CampaignGenerations,
        images: PrismaCampaignImageRepository,
        clock: Clock,
      ) => new GetCampaignImage(generations, images, clock),
    },

    // Ejecución en segundo plano
    {
      provide: GenerationJobs,
      inject: [
        GenerateCampaignCopy,
        GenerateCampaignImage,
        PrismaCampaignCopyRepository,
        PrismaCampaignImageRepository,
        CLOCK,
      ],
      useFactory: (
        copy: GenerateCampaignCopy,
        image: GenerateCampaignImage,
        copies: PrismaCampaignCopyRepository,
        images: PrismaCampaignImageRepository,
        clock: Clock,
      ) => new GenerationJobs(copy, image, copies, images, clock),
    },
    {
      provide: GenerationJobRunner,
      inject: [JOB_QUEUE, GenerationJobs, JOBS_CONFIG, LocalImageArtifacts],
      useFactory: (
        queue: JobQueue,
        jobs: GenerationJobs,
        config: JobsConfig,
        artifacts: LocalImageArtifacts,
      ) => new GenerationJobRunner(queue, jobs, config, artifacts),
    },
  ],
})
export class ContentGenerationModule {}
