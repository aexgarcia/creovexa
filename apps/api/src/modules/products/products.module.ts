import { ConsoleLogger, Module } from '@nestjs/common';
import { PlansModule } from '#app/modules/plans/plans.module';
import { AI_QUOTA, PLAN_LIMITS, type AiQuota, type PlanLimits } from '#app/modules/plans/contract';
import {
  PRODUCT_SUGGESTIONS_CONFIG,
  productSuggestionsConfigProvider,
  type ProductSuggestionsConfig,
} from '#app/config/product-suggestions.config';
import {
  PRODUCT_SALES_ADVISOR,
  type ProductSalesAdvisor,
} from './application/ports/product-sales-advisor.js';
import { SuggestProductSalesData } from './application/use-cases/suggest-product-sales-data.js';
import { GeminiSalesAdvisor } from './infrastructure/gemini-sales-advisor.js';
import { OpenAISalesAdvisor } from './infrastructure/openai-sales-advisor.js';
import { UpdateProductArchive } from './application/use-cases/update-product-archive.js';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaOrganizationLookup } from '#app/infrastructure/persistence/prisma/prisma-organization-lookup';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { RuntimeModule, CLOCK, ID_GENERATOR } from '#app/infrastructure/runtime.module';
import { AssetsModule } from '#app/modules/assets/assets.module';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import { OrganizationsModule } from '#app/modules/organizations/organizations.module';
import { PRODUCT_IMAGES, type ProductImages } from './application/ports/product-images.js';
import { CreateProduct } from './application/use-cases/create-product.js';
import { GetProduct } from './application/use-cases/get-product.js';
import { GetProductImage } from './application/use-cases/get-product-image.js';
import { ListProducts } from './application/use-cases/list-products.js';
import { SaveProductImage } from './application/use-cases/save-product-image.js';
import { UpdateProduct } from './application/use-cases/update-product.js';
import { MinioProductImages } from './infrastructure/minio-product-images.js';
import { PrismaProductRepository } from './infrastructure/persistence/prisma/prisma-product.repository.js';
import { ProductsController } from './presentation/products.controller.js';

@Module({
  imports: [
    DatabaseModule,
    RuntimeModule,
    AssetsModule,
    HttpCommonModule,
    OrganizationsModule,
    PlansModule,
  ],
  controllers: [ProductsController],
  providers: [
    productSuggestionsConfigProvider,
    {
      // Mismo proveedor que el copy (COPY_PROVIDER); sin respaldo automático entre proveedores.
      provide: PRODUCT_SALES_ADVISOR,
      inject: [PRODUCT_SUGGESTIONS_CONFIG],
      useFactory: ({ enabled, provider }: ProductSuggestionsConfig): ProductSalesAdvisor => {
        const logger = new ConsoleLogger('ProductSuggestions', { json: true });
        return provider.provider === 'gemini'
          ? new GeminiSalesAdvisor(enabled, provider.settings, fetch, logger)
          : new OpenAISalesAdvisor(enabled, provider.settings, fetch, logger);
      },
    },
    {
      provide: SuggestProductSalesData,
      inject: [PrismaOrganizationLookup, PRODUCT_SALES_ADVISOR, AI_QUOTA],
      useFactory: (
        organizations: PrismaOrganizationLookup,
        advisor: ProductSalesAdvisor,
        quota: AiQuota,
      ) => new SuggestProductSalesData(organizations, advisor, quota),
    },
    {
      provide: UpdateProductArchive,
      inject: [PrismaProductRepository, CLOCK, PLAN_LIMITS],
      useFactory: (repository: PrismaProductRepository, clock: Clock, limits: PlanLimits) =>
        new UpdateProductArchive(repository, clock, limits),
    },
    {
      provide: PrismaProductRepository,
      inject: [PrismaService],
      useFactory: (client: PrismaService) => new PrismaProductRepository(client),
    },
    {
      provide: PRODUCT_IMAGES,
      inject: [PrismaService, OBJECT_STORAGE],
      useFactory: (client: PrismaService, storage: ObjectStorage) =>
        new MinioProductImages(client, storage),
    },
    ...[GetProduct, ListProducts].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaProductRepository],
      useFactory: (repository: PrismaProductRepository) => new UseCase(repository),
    })),
    {
      provide: CreateProduct,
      inject: [PrismaProductRepository, PrismaOrganizationLookup, ID_GENERATOR, CLOCK, PLAN_LIMITS],
      useFactory: (
        repository: PrismaProductRepository,
        organizations: PrismaOrganizationLookup,
        ids: IdGenerator,
        clock: Clock,
        limits: PlanLimits,
      ) => new CreateProduct(repository, organizations, ids, clock, limits),
    },
    {
      provide: UpdateProduct,
      inject: [PrismaProductRepository, CLOCK],
      useFactory: (repository: PrismaProductRepository, clock: Clock) =>
        new UpdateProduct(repository, clock),
    },
    {
      provide: SaveProductImage,
      inject: [PrismaProductRepository, PRODUCT_IMAGES, ID_GENERATOR, CLOCK],
      useFactory: (
        repository: PrismaProductRepository,
        images: ProductImages,
        ids: IdGenerator,
        clock: Clock,
      ) => new SaveProductImage(repository, images, ids, clock),
    },
    {
      provide: GetProductImage,
      inject: [PRODUCT_IMAGES],
      useFactory: (images: ProductImages) => new GetProductImage(images),
    },
  ],
  // La generación de campañas lee la foto guardada del producto a través de este port.
  exports: [PRODUCT_IMAGES],
})
export class ProductsModule {}
