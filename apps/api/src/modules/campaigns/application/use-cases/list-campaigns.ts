import { entityId } from '#app/domain/entity-id';
import { pagination, type Pagination, type Page } from '#app/domain/pagination';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { campaignResult, type CampaignResult } from '../campaign-result.js';

export class ListCampaigns {
  constructor(private readonly repository: CampaignRepository) {}
  async execute(
    input: { organizationId: string } & Partial<Pagination>,
  ): Promise<Page<CampaignResult> & Pagination> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const window = pagination(input);
    const result = await this.repository.list(organizationId, window);
    return { ...window, total: result.total, items: result.items.map(campaignResult) };
  }
}
