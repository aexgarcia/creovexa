import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { Money } from '#app/domain/value-objects/money';
import { Campaign } from '../../domain/entities/campaign.js';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { Promotion } from '../../domain/value-objects/promotion.js';
import { GenerationSnapshot } from '../../domain/value-objects/generation-snapshot.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaignResources, type CampaignReferences } from '../load-campaign-resources.js';
import type { CampaignLookups } from '../ports/campaign-lookups.js';

export interface CreateCampaignInput extends CampaignReferences {
  title: string;
  instructions?: string;
  cta: string;
  promotion?: {
    amountMinor: number;
    currency: string;
    startsAt?: Date | null;
    endsAt?: Date | null;
  } | null;
}

export class CreateCampaign {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly lookups: CampaignLookups,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateCampaignInput): Promise<CampaignResult> {
    const resources = await loadCampaignResources(input, this.lookups);
    const price = resources.product.regularPrice;
    const promotion =
      input.promotion == null
        ? null
        : Promotion.create(
            Money.fromMinorUnits(price.amountMinor, price.currency),
            Money.fromMinorUnits(input.promotion.amountMinor, input.promotion.currency),
            input.promotion.startsAt ?? null,
            input.promotion.endsAt ?? null,
          );
    const campaign = Campaign.create(this.ids.next(), { ...input, promotion }, this.clock.now());
    GenerationSnapshot.capture(resources, campaign.instructions, campaign.cta, promotion);
    await this.campaigns.add(campaign.organizationId, campaign);
    return campaignResult(campaign);
  }
}
