import { ApiProperty } from '@nestjs/swagger';
class DashboardTotals {
  @ApiProperty({ type: Number }) products!: number;
  @ApiProperty({ type: Number }) templates!: number;
  @ApiProperty({ type: Number }) campaigns!: number;
  @ApiProperty({ type: Number }) published!: number;
  @ApiProperty({ type: Number }) pendingApproval!: number;
}
class CampaignCount {
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: Number }) count!: number;
}
class PlatformCount extends CampaignCount {
  @ApiProperty({ type: String }) platform!: string;
}
class RecentCampaign {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) status!: string;
  @ApiProperty({ type: String }) createdAt!: string;
}
class DashboardResponse {
  @ApiProperty({ type: DashboardTotals }) totals!: DashboardTotals;
  @ApiProperty({ type: [CampaignCount] }) campaignsByStatus!: CampaignCount[];
  @ApiProperty({ type: [PlatformCount] }) publicationsByPlatform!: PlatformCount[];
  @ApiProperty({ type: [RecentCampaign] }) recentCampaigns!: RecentCampaign[];
}
export class DashboardEnvelope {
  @ApiProperty({ type: DashboardResponse }) data!: DashboardResponse;
}
