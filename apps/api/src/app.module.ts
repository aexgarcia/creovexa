import { Module } from '@nestjs/common';
import { applicationConfigProvider } from './config/application.config.js';
import { HealthController } from './health/health.controller.js';
import { HttpCommonModule } from './infrastructure/http-common.module.js';
import { CampaignsModule } from './modules/campaigns/campaigns.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { PublicationsModule } from './modules/publications/publications.module.js';
import { TemplatesModule } from './modules/templates/templates.module.js';

@Module({
  imports: [
    HttpCommonModule,
    OrganizationsModule,
    ProductsModule,
    TemplatesModule,
    CampaignsModule,
    PublicationsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [applicationConfigProvider],
})
export class AppModule {}
