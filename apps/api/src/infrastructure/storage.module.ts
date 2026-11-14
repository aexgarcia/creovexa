import { Module } from '@nestjs/common';
import { STORAGE_CONFIG, readOptionalStorageConfig } from '#app/config/storage.config';
import { applicationEnvironment } from '#app/config/environment';

@Module({
  providers: [
    {
      provide: STORAGE_CONFIG,
      useFactory: () => readOptionalStorageConfig(applicationEnvironment()),
    },
  ],
  exports: [STORAGE_CONFIG],
})
export class StorageModule {}
