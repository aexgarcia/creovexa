import type { Clock } from '#app/application/ports/clock';
import type { GenerationFailureCode } from '../../domain/campaign-status.js';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';

export interface RecordCampaignGenerationFailureInput extends CampaignSelection {
  generationId: string;
  code: GenerationFailureCode;
}

export class RecordCampaignGenerationFailure {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: RecordCampaignGenerationFailureInput): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    const updated = campaign.recordGenerationFailure(
      input.generationId,
      input.code,
      this.clock.now(),
    );
    if (updated !== campaign) {
      await this.campaigns.save(campaign.organizationId, updated, campaign.version);
    }
    return campaignResult(updated);
  }
}
