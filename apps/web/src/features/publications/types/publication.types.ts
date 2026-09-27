import type { PublicationStatus, SocialPlatform } from '@/features/campaigns/types/campaign.types';

export interface PublicationRecord {
  id: string;

  campaignId: string;
  campaignName: string;

  platform: SocialPlatform;

  status: PublicationStatus;

  externalPublicationId: string | null;

  externalUrl: string | null;

  failureReason: string | null;

  publishedAt: string;
}
