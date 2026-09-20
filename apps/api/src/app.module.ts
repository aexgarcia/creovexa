import { Module } from '@nestjs/common';
import { applicationConfigProvider } from './config/application.config.js';
import { HealthController } from './health/health.controller.js';
import { CommercialPersistenceModule } from './infrastructure/commercial-persistence.module.js';

@Module({
  imports: [CommercialPersistenceModule],
  controllers: [HealthController],
  providers: [applicationConfigProvider],
})
export class AppModule {}
