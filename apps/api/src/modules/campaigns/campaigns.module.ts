import { Module } from '@nestjs/common';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { HttpCommonModule } from '#app/infrastructure/http-common.module';
import { DatabaseModule } from '#app/infrastructure/persistence/prisma/database.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import { RuntimeModule, CLOCK, ID_GENERATOR } from '#app/infrastructure/runtime.module';
import { AssetsModule } from '#app/modules/assets/assets.module';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import {
  CAMPAIGN_FINAL_ASSETS,
  type CampaignFinalAssets,
} from './application/ports/campaign-final-assets.js';
import { ApproveCampaign } from './application/use-cases/approve-campaign.js';
import { CreateCampaign } from './application/use-cases/create-campaign.js';
import { GetCampaign } from './application/use-cases/get-campaign.js';
import { GetCampaignFinalAsset } from './application/use-cases/get-campaign-final-asset.js';
import { ListCampaigns } from './application/use-cases/list-campaigns.js';
import { RecordCampaignGenerationFailure } from './application/use-cases/record-campaign-generation-failure.js';
import { RecordGeneratedCampaign } from './application/use-cases/record-generated-campaign.js';
import { RequestCampaignGeneration } from './application/use-cases/request-campaign-generation.js';
import { RequestCampaignRegeneration } from './application/use-cases/request-campaign-regeneration.js';
import { PrismaCampaignLookups } from './infrastructure/persistence/prisma/prisma-campaign-lookups.js';
import { PrismaCampaignRepository } from './infrastructure/persistence/prisma/prisma-campaign.repository.js';
import { StoredCampaignAssets } from './infrastructure/stored-campaign-assets.js';
import { CampaignsController } from './presentation/campaigns.controller.js';

@Module({
  imports: [DatabaseModule, RuntimeModule, AssetsModule, HttpCommonModule],
  controllers: [CampaignsController],
  providers: [
    ...[PrismaCampaignRepository, PrismaCampaignLookups].map((Repository) => ({
      provide: Repository,
      inject: [PrismaService],
      useFactory: (db: PrismaService) => new Repository(db),
    })),
    {
      provide: CAMPAIGN_FINAL_ASSETS,
      inject: [PrismaService, OBJECT_STORAGE],
      useFactory: (db: PrismaService, storage: ObjectStorage) =>
        new StoredCampaignAssets(db, storage),
    },
    ...[GetCampaign, ListCampaigns].map((UseCase) => ({
      provide: UseCase,
      inject: [PrismaCampaignRepository],
      useFactory: (repo: PrismaCampaignRepository) => new UseCase(repo),
    })),
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
      provide: RecordCampaignGenerationFailure,
      inject: [PrismaCampaignRepository, CLOCK],
      useFactory: (repo: PrismaCampaignRepository, clock: Clock) =>
        new RecordCampaignGenerationFailure(repo, clock),
    },
    {
      provide: ApproveCampaign,
      inject: [PrismaCampaignRepository, CLOCK, CAMPAIGN_FINAL_ASSETS],
      useFactory: (repo: PrismaCampaignRepository, clock: Clock, assets: CampaignFinalAssets) =>
        new ApproveCampaign(repo, clock, assets),
    },
    {
      provide: GetCampaignFinalAsset,
      inject: [PrismaCampaignRepository, CAMPAIGN_FINAL_ASSETS],
      useFactory: (repo: PrismaCampaignRepository, assets: CampaignFinalAssets) =>
        new GetCampaignFinalAsset(repo, assets),
    },
  ],
  // Content generation executes a campaign's generation, so it shares these two.
  exports: [PrismaCampaignRepository, PrismaCampaignLookups],
})
export class CampaignsModule {}
