import { entityId } from '#app/domain/entity-id';
import { pagination, type Pagination } from '#app/domain/pagination';
import { CampaignNotFoundError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import type { PublicationRepository } from '../../domain/repositories/publication.repository.js';
import type { PublicationCampaignLookup } from '../ports/publication-campaign-lookup.js';
import { publicationResult } from '../publication-result.js';

export class ListCampaignPublications {
  constructor(
    private readonly publications: PublicationRepository,
    private readonly campaigns: PublicationCampaignLookup,
  ) {}
  async execute(input: { organizationId: string; campaignId: string } & Partial<Pagination>) {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const campaignId = entityId(input.campaignId, 'campaignId');
    const window = pagination(input);
    if (!(await this.campaigns.exists(organizationId, campaignId)))
      throw new CampaignNotFoundError();
    const result = await this.publications.pageByCampaign(organizationId, campaignId, window);
    return { ...window, total: result.total, items: result.items.map(publicationResult) };
  }
}
