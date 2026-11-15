import { Module } from '@nestjs/common';
import { applicationEnvironment } from '#app/config/environment';
import {
  STORAGE_CONFIG,
  readOptionalStorageConfig,
  type StorageConfig,
} from '#app/config/storage.config';
import { OBJECT_STORAGE } from './application/ports/object-storage.js';
import { S3ObjectStorage } from './infrastructure/s3-object-storage.js';

@Module({
  providers: [
    {
      provide: STORAGE_CONFIG,
      useFactory: () => readOptionalStorageConfig(applicationEnvironment()),
    },
    {
      provide: OBJECT_STORAGE,
      inject: [STORAGE_CONFIG],
      useFactory: (config: StorageConfig | null) => new S3ObjectStorage(config),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class AssetsModule {}
