export type CampaignStatus =
  | 'DRAFT'
  | 'GENERATING_COPY'
  | 'GENERATING_IMAGE'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED';

export type PublicationStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

export type SocialPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';

export interface DashboardMetric {
  value: number;
  variation?: number;
}

export interface DashboardMetrics {
  campaigns: DashboardMetric;
  products: DashboardMetric;
  publications: DashboardMetric;
  pendingApproval: DashboardMetric;
}

export interface DashboardCampaign {
  id: string;
  name: string;
  productName: string;
  status: CampaignStatus;
  createdAt: string;
}

export interface PlatformPublicationSummary {
  platform: SocialPlatform;
  published: number;
  failed: number;
  pending: number;
}

export interface DashboardActivity {
  id: string;
  action:
    | 'CAMPAIGN_CREATED'
    | 'CONTENT_GENERATED'
    | 'IMAGE_REGENERATED'
    | 'CAMPAIGN_APPROVED'
    | 'PUBLICATION_REQUESTED'
    | 'PUBLICATION_SUCCEEDED'
    | 'PUBLICATION_FAILED';

  message: string;
  createdAt: string;
}

export interface CampaignStatusSummary {
  draft: number;
  pendingApproval: number;
  approved: number;
  published: number;
  failed: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  campaignStatus: CampaignStatusSummary;
  recentCampaigns: DashboardCampaign[];
  publications: PlatformPublicationSummary[];
  recentActivity: DashboardActivity[];
}
