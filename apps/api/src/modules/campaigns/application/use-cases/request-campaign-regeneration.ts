import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { GenerationSnapshot } from '../../domain/value-objects/generation-snapshot.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';
import { loadCampaignResources } from '../load-campaign-resources.js';
import type { CampaignLookups } from '../ports/campaign-lookups.js';

export class RequestCampaignRegeneration {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly lookups: CampaignLookups,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CampaignSelection): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    const resources = await loadCampaignResources(campaign, this.lookups);
    const snapshot = GenerationSnapshot.capture(
      resources,
      campaign.instructions,
      campaign.cta,
      campaign.promotion,
    );
    const updated = campaign.requestRegeneration(this.ids.next(), snapshot, this.clock.now());
    await this.campaigns.save(campaign.organizationId, updated, campaign.version);
    return campaignResult(updated);
  }
}
