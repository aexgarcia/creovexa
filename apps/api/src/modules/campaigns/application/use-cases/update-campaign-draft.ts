import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import { ConcurrentCampaignModificationError } from '../../domain/errors/campaign.errors.js';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { GenerationSnapshot } from '../../domain/value-objects/generation-snapshot.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';
import { loadCampaign } from '../load-campaign.js';
import { loadCampaignResources } from '../load-campaign-resources.js';
import type { CampaignLookups } from '../ports/campaign-lookups.js';
import { promotionFor, type CampaignBriefInput } from './create-campaign.js';

export interface UpdateCampaignDraftInput extends CampaignBriefInput {
  campaignId: string;
  // La versión que el usuario editó; si otro la cambió antes, se rechaza.
  expectedVersion: number;
}

// Reemplaza el brief completo de una campaña en borrador.
export class UpdateCampaignDraft {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly lookups: CampaignLookups,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateCampaignDraftInput): Promise<CampaignResult> {
    const campaign = await loadCampaign(input, this.campaigns);
    if (campaign.version !== input.expectedVersion) throw new ConcurrentCampaignModificationError();
    const resources = await loadCampaignResources(input, this.lookups);
    const updated = campaign.updateDraft(
      {
        ...input,
        promotion: promotionFor(input.promotion, resources.product),
      },
      this.clock.now(),
    );
    GenerationSnapshot.capture(resources, updated.brief);
    await this.campaigns.saveDraft(
      entityId(input.organizationId, 'organizationId'),
      updated,
      input.expectedVersion,
    );
    return campaignResult(updated);
  }
}
