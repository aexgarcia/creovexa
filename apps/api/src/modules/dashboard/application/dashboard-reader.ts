import type { EntityId } from '#app/domain/entity-id';
export interface DashboardResult {
  totals: {
    products: number;
    templates: number;
    campaigns: number;
    published: number;
    pendingApproval: number;
  };
  campaignsByStatus: { status: string; count: number }[];
  publicationsByPlatform: { platform: string; status: string; count: number }[];
  recentCampaigns: { id: string; title: string; status: string; createdAt: string }[];
}
export interface DashboardReader {
  read(organizationId: EntityId): Promise<DashboardResult>;
}
