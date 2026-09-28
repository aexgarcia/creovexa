import { apiRequest } from '@/lib/api-client';
import type { StoredCampaignStatus } from '@/features/campaigns/types/stored-campaign.types';
export interface DashboardSummary {
  totals: {
    products: number;
    templates: number;
    campaigns: number;
    published: number;
    pendingApproval: number;
  };
  campaignsByStatus: { status: StoredCampaignStatus; count: number }[];
  publicationsByPlatform: { platform: string; status: string; count: number }[];
  recentCampaigns: { id: string; title: string; status: StoredCampaignStatus; createdAt: string }[];
}
export const dashboardService = {
  async getDashboard(signal?: AbortSignal): Promise<DashboardSummary> {
    return (await apiRequest<{ data: DashboardSummary }>('/dashboard', { signal })).data;
  },
};
