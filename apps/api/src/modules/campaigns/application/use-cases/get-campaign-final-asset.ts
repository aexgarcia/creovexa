import { entityId } from '#app/domain/entity-id';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';
import type { CampaignFinalAssets } from '../ports/campaign-final-assets.js';
import { CampaignImageError } from '../errors/campaign-image.error.js';
export class GetCampaignFinalAsset {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly assets: CampaignFinalAssets,
  ) {}
  async execute(input: CampaignSelection & { assetId: string }) {
    const campaign = await loadCampaign(input, this.campaigns);
    const assetId = entityId(input.assetId);
    const content = campaign.candidateContent;
    if (!content || content.assetIds.length !== 1 || content.assetIds[0] !== assetId)
      throw new CampaignImageError('NOT_FOUND');
    const result = await this.assets.readFinal({
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      generationId: content.generationId,
      assetId,
    });
    if (!result) throw new CampaignImageError('NOT_FOUND');
    return result;
  }
}
