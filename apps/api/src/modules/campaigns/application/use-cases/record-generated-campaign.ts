import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import {
  GeneratedContent,
  type GeneratedContentPayload,
} from '../../domain/entities/generated-content.js';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';

export interface RecordGeneratedCampaignInput extends CampaignSelection {
  generationId: string;
  content: GeneratedContentPayload;
}

export class RecordGeneratedCampaign {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: RecordGeneratedCampaignInput): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    const generation = campaign.requireGeneration(input.generationId);
    const at = this.clock.now();
    const content = GeneratedContent.create(
      {
        id: campaign.candidateContent?.id ?? this.ids.next(),
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        generationId: generation.id,
        revision: generation.number,
      },
      generation.snapshot,
      input.content,
      at,
    );
    const updated = campaign.recordGeneratedContent(content, at);
    if (updated !== campaign) {
      await this.campaigns.save(campaign.organizationId, updated, campaign.version);
    }
    return campaignResult(updated);
  }
}
