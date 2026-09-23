import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';

export class GetCampaign {
  constructor(private readonly repository: CampaignRepository) {}
  async execute(input: CampaignSelection): Promise<CampaignResult> {
    return campaignResult(await loadCampaign(input, this.repository));
  }
}
