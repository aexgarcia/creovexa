import type { Clock } from '#app/application/ports/clock';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';

export interface ApproveCampaignInput extends CampaignSelection {
  contentId: string;
}

export class ApproveCampaign {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: ApproveCampaignInput): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    const updated = campaign.approve(input.contentId, this.clock.now());
    await this.campaigns.save(campaign.organizationId, updated, campaign.version);
    return campaignResult(updated);
  }
}
