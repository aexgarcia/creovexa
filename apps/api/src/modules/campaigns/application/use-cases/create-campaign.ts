import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { Money } from '#app/domain/value-objects/money';
import type { CampaignObjective } from '../../domain/campaign-objective.js';
import type { CopyChannel } from '../../domain/copy-channel.js';
import { Campaign } from '../../domain/entities/campaign.js';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { Promotion } from '../../domain/value-objects/promotion.js';
import {
  GenerationSnapshot,
  type GenerationResources,
} from '../../domain/value-objects/generation-snapshot.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaignResources, type CampaignReferences } from '../load-campaign-resources.js';
import type { CampaignLookups } from '../ports/campaign-lookups.js';

export interface PromotionInput {
  amountMinor: number;
  currency: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
  conditions?: string | null;
  showDiscount?: boolean;
}

export interface CampaignBriefInput extends CampaignReferences {
  title: string;
  objective?: CampaignObjective;
  occasion?: string | null;
  channel?: CopyChannel;
  instructions?: string;
  cta: string;
  promotion?: PromotionInput | null;
}

export type CreateCampaignInput = CampaignBriefInput;

/** La promoción se valida contra el precio vigente del producto elegido. */
export function promotionFor(
  input: PromotionInput | null | undefined,
  product: GenerationResources['product'],
): Promotion | null {
  if (input == null) return null;
  const price = product.regularPrice;
  return Promotion.create(
    Money.fromMinorUnits(price.amountMinor, price.currency),
    Money.fromMinorUnits(input.amountMinor, input.currency),
    input.startsAt ?? null,
    input.endsAt ?? null,
    { conditions: input.conditions ?? null, showDiscount: input.showDiscount ?? false },
  );
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
    const promotion = promotionFor(input.promotion, resources.product);
    const campaign = Campaign.create(this.ids.next(), { ...input, promotion }, this.clock.now());
    // Comprueba desde ya que la campaña podrá generarse con estos datos.
    GenerationSnapshot.capture(resources, campaign.brief);
    await this.campaigns.add(campaign.organizationId, campaign);
    return campaignResult(campaign);
  }
}
