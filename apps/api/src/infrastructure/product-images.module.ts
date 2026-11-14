import { Module } from '@nestjs/common';
import { resolve } from 'node:path';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { STORAGE_CONFIG, type StorageConfig } from '#app/config/storage.config';
import { StorageModule } from './storage.module.js';
import {
  PRODUCT_IMAGES,
  type ProductImages,
} from '#app/modules/products/application/ports/product-images';
import { MinioProductImages } from '#app/modules/products/infrastructure/minio-product-images';
import { SaveProductImage } from '#app/modules/products/application/use-cases/save-product-image';
import { GetProductImage } from '#app/modules/products/application/use-cases/get-product-image';
import { PrismaProductRepository } from '#app/modules/products/infrastructure/persistence/prisma/prisma-product.repository';
import { LocalImageArtifacts } from '#app/modules/campaigns/infrastructure/local-image-artifacts';
import { StoredProductImageSource } from '#app/modules/campaigns/infrastructure/stored-product-image-source';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { RuntimeModule, CLOCK, ID_GENERATOR } from './runtime.module.js';

@Module({
  imports: [DatabaseModule, RuntimeModule, StorageModule],
  providers: [
    {
      provide: PRODUCT_IMAGES,
      inject: [PrismaService, STORAGE_CONFIG],
      useFactory: (client: PrismaService, config: StorageConfig | null) =>
        new MinioProductImages(client, config),
    },
    {
      provide: SaveProductImage,
      inject: [PrismaService, PRODUCT_IMAGES, ID_GENERATOR, CLOCK],
      useFactory: (client: PrismaService, images: ProductImages, ids: IdGenerator, clock: Clock) =>
        new SaveProductImage(new PrismaProductRepository(client), images, ids, clock),
    },
    {
      provide: GetProductImage,
      inject: [PRODUCT_IMAGES],
      useFactory: (images: ProductImages) => new GetProductImage(images),
    },
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
  ],
  exports: [
    StorageModule,
    SaveProductImage,
    GetProductImage,
    PRODUCT_IMAGES,
    StoredProductImageSource,
    LocalImageArtifacts,
  ],
})
export class ProductImagesModule {}
