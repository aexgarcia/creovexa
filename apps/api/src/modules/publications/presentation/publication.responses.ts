import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
import { PublicationStatus } from '#app/domain/publication-status';
import { PublicationFailureCode } from '../domain/entities/publication.js';
import { SocialPlatform } from '../domain/social-platform.js';
import type { PublicationResult } from '../application/publication-result.js';

export class PublicationAttemptResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: String, format: 'date-time' }) startedAt!: string;
}
export class PublicationResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) campaignId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) approvedContentId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) socialAccountId!: string;
  @ApiProperty({ enum: SocialPlatform, enumName: 'SocialPlatform' }) platform!: SocialPlatform;
  @ApiProperty({ enum: PublicationStatus, enumName: 'PublicationStatus' })
  status!: PublicationStatus;
  @ApiProperty({ type: PublicationAttemptResponse, nullable: true })
  attempt!: PublicationAttemptResponse | null;
  @ApiProperty({ type: String, nullable: true }) externalPostId!: string | null;
  @ApiProperty({ enum: PublicationFailureCode, nullable: true })
  failureCode!: PublicationFailureCode | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: Number }) version!: number;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class PublicationPageResponse {
  @ApiProperty({ type: [PublicationResponse] }) data!: PublicationResponse[];
  @ApiProperty({ type: PaginationResponse }) meta!: PaginationResponse;
}
export function publicationResponse(result: PublicationResult): PublicationResponse {
  return {
    id: result.id,
    campaignId: result.campaignId,
    approvedContentId: result.approvedContentId,
    socialAccountId: result.socialAccountId,
    platform: result.platform,
    status: result.status,
    attempt: result.attempt
      ? {
          id: result.attempt.id,
          number: result.attempt.number,
          startedAt: result.attempt.startedAt,
        }
      : null,
    externalPostId: result.externalPostId,
    failureCode: result.failureCode,
    publishedAt: result.publishedAt,
    version: result.version,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}
