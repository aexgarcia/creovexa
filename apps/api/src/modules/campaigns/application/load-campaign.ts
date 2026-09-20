import { entityId } from '#app/domain/entity-id';
import { CampaignNotFoundError } from '../domain/errors/campaign.errors.js';
import type { CampaignRepository } from '../domain/repositories/campaign.repository.js';

export interface CampaignSelection {
  organizationId: string;
  campaignId: string;
}

export async function loadCampaign(input: CampaignSelection, repository: CampaignRepository) {
  const organizationId = entityId(input.organizationId, 'organizationId');
  const campaignId = entityId(input.campaignId, 'campaignId');
  const campaign = await repository.findById(organizationId, campaignId);
  if (!campaign || campaign.organizationId !== organizationId || campaign.id !== campaignId) {
    throw new CampaignNotFoundError();
  }
  return campaign;
}
