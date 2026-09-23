import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '#app/domain/value-objects/money';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
import { CampaignStatus } from '../domain/campaign-status.js';
import type { CampaignResult } from '../application/campaign-result.js';

export class PromotionResponse {
  @ApiProperty({ type: Number }) amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) startsAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) endsAt!: string | null;
}
export class CandidateContentResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String }) headline!: string;
  @ApiProperty({ type: String }) caption!: string;
  @ApiProperty({ type: String }) cta!: string;
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty({ type: [String] }) assetIds!: string[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
export class CampaignResponse {
  @ApiProperty({ type: CandidateContentResponse, nullable: true })
  candidateContent!: CandidateContentResponse | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) approvedContentId!: string | null;
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) productId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) templateId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) templateRevisionId!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) instructions!: string;
  @ApiProperty({ type: String }) cta!: string;
  @ApiProperty({ type: PromotionResponse, nullable: true }) promotion!: PromotionResponse | null;
  @ApiProperty({ enum: CampaignStatus, enumName: 'CampaignStatus' }) status!: CampaignStatus;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class CampaignEnvelope {
  @ApiProperty({ type: CampaignResponse }) data!: CampaignResponse;
}
export class CampaignPageResponse {
  @ApiProperty({ type: [CampaignResponse] }) data!: CampaignResponse[];
  @ApiProperty({ type: PaginationResponse }) meta!: PaginationResponse;
}
export function campaignResponse(result: CampaignResult): CampaignResponse {
  return {
    candidateContent: result.candidateContent
      ? {
          id: result.candidateContent.id,
          revision: result.candidateContent.revision,
          headline: result.candidateContent.headline,
          caption: result.candidateContent.caption,
          cta: result.candidateContent.cta,
          hashtags: [...result.candidateContent.hashtags],
          assetIds: [...result.candidateContent.assetIds],
          createdAt: result.candidateContent.createdAt,
        }
      : null,
    approvedContentId: result.approvedContentId,
    id: result.id,
    organizationId: result.organizationId,
    productId: result.productId,
    templateId: result.templateId,
    templateRevisionId: result.templateRevisionId,
    title: result.title,
    instructions: result.instructions,
    cta: result.cta,
    promotion: result.promotion ? { ...result.promotion } : null,
    status: result.status,
    version: result.version,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}
