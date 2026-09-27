import { campaignService } from '@/features/campaigns/services/campaign.service';

import type { PublicationRecord } from '../types/publication.types';

class PublicationService {
  async findAll(): Promise<PublicationRecord[]> {
    const campaigns = await campaignService.findAll();

    const publications = campaigns.flatMap((campaign) =>
      campaign.publications.map(
        (publication): PublicationRecord => ({
          id: publication.id,

          campaignId: campaign.id,

          campaignName: campaign.name,

          platform: publication.platform,

          status: publication.status,

          externalPublicationId: publication.externalPublicationId,

          externalUrl: publication.externalUrl,

          failureReason: publication.failureReason,

          /*
           * Temporalmente usamos
           * updatedAt de Campaign.
           *
           * Cuando tengamos backend,
           * Publication tendrá su
           * propio publishedAt.
           */
          publishedAt: campaign.updatedAt,
        }),
      ),
    );

    return publications.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }
}

export const publicationService = new PublicationService();
