import type { CampaignVersionResult } from '../application/use-cases/campaign-versions.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '#app/domain/value-objects/money';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
import { CampaignObjective } from '../domain/campaign-objective.js';
import { CampaignStatus } from '../domain/campaign-status.js';
import type { CampaignResult } from '../application/campaign-result.js';

export class PromotionResponse {
  @ApiProperty({ type: Number }) amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) startsAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) endsAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) conditions!: string | null;
  @ApiProperty({ type: Boolean }) showDiscount!: boolean;
}
export class CandidateContentResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: Number }) revision!: number;
  @ApiProperty({ type: String }) headline!: string;
  @ApiProperty({ type: String, nullable: true }) subheadline!: string | null;
  @ApiProperty({ type: String }) caption!: string;
  @ApiProperty({ type: String }) cta!: string;
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty({ type: [String] }) assetIds!: string[];
  @ApiProperty({ type: String, nullable: true }) finalAssetUrl!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
export class CampaignResponse {
  @ApiProperty({ type: CandidateContentResponse, nullable: true })
  candidateContent!: CandidateContentResponse | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) approvedContentId!: string | null;
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) productId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) productImageUrl?: string | null;
  @ApiProperty({ type: String, format: 'uuid' }) templateId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) templateRevisionId!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ enum: CampaignObjective, enumName: 'CampaignObjective' })
  objective!: CampaignObjective;
  @ApiProperty({ type: String, nullable: true }) occasion!: string | null;
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
          subheadline: result.candidateContent.subheadline,
          caption: result.candidateContent.caption,
          cta: result.candidateContent.cta,
          hashtags: [...result.candidateContent.hashtags],
          assetIds: [...result.candidateContent.assetIds],
          finalAssetUrl:
            result.candidateContent.assetIds.length === 1
              ? `/campaigns/${result.id}/assets/${result.candidateContent.assetIds[0]}`
              : null,
          createdAt: result.candidateContent.createdAt,
        }
      : null,
    approvedContentId: result.approvedContentId,
    id: result.id,
    organizationId: result.organizationId,
    productId: result.productId,
    ...(result.generation
      ? {
          productImageUrl:
            result.generation.snapshot.product.imageAssetIds.length === 1
              ? `/products/${result.productId}/images/${result.generation.snapshot.product.imageAssetIds[0]}`
              : null,
        }
      : {}),
    templateId: result.templateId,
    templateRevisionId: result.templateRevisionId,
    title: result.title,
    objective: result.objective,
    occasion: result.occasion,
    instructions: result.instructions,
    cta: result.cta,
    promotion: result.promotion ? { ...result.promotion } : null,
    status: result.status,
    version: result.version,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

class VersionPriceResponse {
  @ApiProperty({ type: Number }) amountMinor!: number;
  @ApiProperty({ type: String }) currency!: string;
}
class VersionPricesResponse {
  @ApiProperty({ type: VersionPriceResponse }) regular!: VersionPriceResponse;
  @ApiProperty({ type: VersionPriceResponse, nullable: true })
  promotion!: VersionPriceResponse | null;
}
class VersionContentResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) headline!: string;
  @ApiProperty({ type: String, nullable: true }) subheadline!: string | null;
  @ApiProperty({ type: String }) caption!: string;
  @ApiProperty({ type: String }) cta!: string;
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty({ type: String, nullable: true }) finalAssetUrl!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
export class CampaignVersionResponse {
  @ApiProperty({ type: String, format: 'uuid' }) generationId!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String, format: 'date-time' }) requestedAt!: string;
  @ApiProperty({ type: Boolean, description: 'La versión vigente de la campaña' })
  current!: boolean;
  @ApiProperty({
    type: VersionContentResponse,
    nullable: true,
    description: 'null si falló o sigue en curso',
  })
  content!: VersionContentResponse | null;
  @ApiProperty({ type: String, nullable: true, description: 'Motivo si la generación falló' })
  failure!: string | null;
  @ApiProperty({ type: VersionPricesResponse, description: 'Precios congelados en su snapshot' })
  prices!: VersionPricesResponse;
}
export class CampaignVersionsEnvelope {
  @ApiProperty({ type: [CampaignVersionResponse] }) data!: CampaignVersionResponse[];
}

export function campaignVersionResponse(
  campaignId: string,
  version: CampaignVersionResult,
): CampaignVersionResponse {
  const content = version.content;
  return {
    ...version,
    content: content && {
      id: content.id,
      headline: content.headline,
      subheadline: content.subheadline,
      caption: content.caption,
      cta: content.cta,
      hashtags: content.hashtags,
      finalAssetUrl:
        content.assetIds.length === 1
          ? `/campaigns/${campaignId}/assets/${content.assetIds[0]}`
          : null,
      createdAt: content.createdAt,
    },
  };
}
