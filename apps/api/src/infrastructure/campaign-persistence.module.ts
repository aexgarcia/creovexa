import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { GetCampaign } from '#app/modules/campaigns/application/use-cases/get-campaign';
import { ListCampaigns } from '#app/modules/campaigns/application/use-cases/list-campaigns';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { RequestCampaignRegeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-regeneration';
import { RecordGeneratedCampaign } from '#app/modules/campaigns/application/use-cases/record-generated-campaign';
import { RecordCampaignGenerationFailure } from '#app/modules/campaigns/application/use-cases/record-campaign-generation-failure';
import { ApproveCampaign } from '#app/modules/campaigns/application/use-cases/approve-campaign';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';
import { PrismaCampaignLookups } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign-lookups';
import { DatabaseModule } from './persistence/prisma/database.module.js';
import { PrismaService } from './persistence/prisma/prisma.service.js';
import { RuntimeModule, CLOCK, ID_GENERATOR } from './runtime.module.js';
import { CampaignImageModule } from './campaign-image.module.js';
import {
  CAMPAIGN_FINAL_ASSETS,
  type CampaignFinalAssets,
} from '#app/modules/campaigns/application/ports/campaign-final-assets';

@Module({
  imports: [DatabaseModule, RuntimeModule, CampaignImageModule],
  providers: [
    ...[GetCampaign, ListCampaigns].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaCampaignRepository],
      useFactory: (repo: PrismaCampaignRepository) => new UseCase(repo),
    })),
    {
      provide: PrismaCampaignRepository,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaCampaignRepository(db),
    },
    {
      provide: PrismaCampaignLookups,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new PrismaCampaignLookups(db),
    },
    ...[CreateCampaign, RequestCampaignGeneration, RequestCampaignRegeneration].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaCampaignRepository, PrismaCampaignLookups, ID_GENERATOR, CLOCK],
      useFactory: (
        repo: PrismaCampaignRepository,
        lookups: PrismaCampaignLookups,
        ids: IdGenerator,
        clock: Clock,
      ) => new UseCase(repo, lookups, ids, clock),
    })),
    {
      provide: RecordGeneratedCampaign,
      inject: [PrismaCampaignRepository, ID_GENERATOR, CLOCK],
      useFactory: (repo: PrismaCampaignRepository, ids: IdGenerator, clock: Clock) =>
        new RecordGeneratedCampaign(repo, ids, clock),
    },
    {
      provide: ApproveCampaign,
      inject: [PrismaCampaignRepository, CLOCK, CAMPAIGN_FINAL_ASSETS],
      useFactory: (repo: PrismaCampaignRepository, clock: Clock, assets: CampaignFinalAssets) =>
        new ApproveCampaign(repo, clock, assets),
    },
    ...[RecordCampaignGenerationFailure].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaCampaignRepository, CLOCK],
      useFactory: (repo: PrismaCampaignRepository, clock: Clock) => new UseCase(repo, clock),
    })),
  ],
  exports: [
    PrismaCampaignRepository,
    PrismaCampaignLookups,
    GetCampaign,
    ListCampaigns,
    CreateCampaign,
    RequestCampaignGeneration,
    RequestCampaignRegeneration,
    RecordGeneratedCampaign,
    RecordCampaignGenerationFailure,
    ApproveCampaign,
  ],
})
export class CampaignPersistenceModule {}
