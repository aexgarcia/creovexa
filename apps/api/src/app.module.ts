import { Module } from '@nestjs/common';
import { applicationConfigProvider } from './config/application.config.js';
import { HealthController } from './health/health.controller.js';
import { CommercialPersistenceModule } from './infrastructure/commercial-persistence.module.js';
import { CampaignPersistenceModule } from './infrastructure/campaign-persistence.module.js';
import { PublicationPersistenceModule } from './infrastructure/publication-persistence.module.js';
import { CatalogHttpModule } from './infrastructure/catalog-http.module.js';

@Module({
  imports: [
    CommercialPersistenceModule,
    CampaignPersistenceModule,
    PublicationPersistenceModule,
    CatalogHttpModule,
  ],
  controllers: [HealthController],
  providers: [applicationConfigProvider],
})
export class AppModule {}
