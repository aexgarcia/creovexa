import type { Clock } from '#app/application/ports/clock';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';
import type { CampaignFinalAssets } from '../ports/campaign-final-assets.js';
import { CampaignImageError } from '../errors/campaign-image.error.js';

export interface ApproveCampaignInput extends CampaignSelection {
  contentId: string;
}

export class ApproveCampaign {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly clock: Clock,
    private readonly assets: CampaignFinalAssets,
  ) {}

  async execute(input: ApproveCampaignInput): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    const updated = campaign.approve(input.contentId, this.clock.now());
    const content = campaign.candidateContent!;
    if (
      content.assetIds.length !== 1 ||
      !(await this.assets.readFinal({
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        generationId: content.generationId,
        assetId: content.assetIds[0],
      }))
    )
      throw new CampaignImageError('FINAL_ASSET_REQUIRED');
    campaign.promotion?.assertNotExpired(this.clock.now());
    await this.campaigns.save(campaign.organizationId, updated, campaign.version);
    return campaignResult(updated);
  }
}
