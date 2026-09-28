import { ConsoleLogger, Module } from '@nestjs/common';
import {
  OPENAI_COPY_CONFIG,
  openAICopyConfigProvider,
  type OpenAICopyConfig,
} from '#app/config/openai.config';
import { CampaignCopyController } from '#app/modules/campaigns/presentation/campaign-copy.controller';
import {
  GenerateCampaignCopy,
  GetCampaignCopy,
} from '#app/modules/campaigns/application/use-cases/generate-campaign-copy';
import type { CopyGenerator } from '#app/modules/campaigns/application/ports/copy-generator';
import {
  COPY_GENERATOR,
  OpenAICopyGenerator,
} from '#app/modules/campaigns/infrastructure/openai-copy-generator';
import { PrismaCampaignCopyRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-copy.repository';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaCampaignLookups } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-lookups';
import { catalogHttpConfigProvider } from '#app/config/catalog-http.config';
import { DevelopmentOrganizationGuard } from '#app/presentation/http/request-context';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { CampaignPersistenceModule } from './campaign-persistence.module.js';
import { RuntimeModule, CLOCK, ID_GENERATOR } from './runtime.module.js';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
@Module({
  imports: [CampaignPersistenceModule, RuntimeModule, DatabaseModule],
  controllers: [CampaignCopyController],
  providers: [
    catalogHttpConfigProvider,
    DevelopmentOrganizationGuard,
    openAICopyConfigProvider,
    {
      provide: COPY_GENERATOR,
      inject: [OPENAI_COPY_CONFIG],
      useFactory: (config: OpenAICopyConfig) =>
        new OpenAICopyGenerator(config, fetch, new ConsoleLogger('CopyGeneration', { json: true })),
    },
    {
      provide: PrismaCampaignCopyRepository,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaCampaignCopyRepository(db),
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
  ],
})
export class CampaignCopyModule {}
