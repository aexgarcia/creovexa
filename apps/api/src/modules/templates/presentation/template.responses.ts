import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
import type { TemplateResult } from '../application/template-result.js';

export class DimensionsResponse {
  @ApiProperty({ type: Number }) width!: number;
  @ApiProperty({ type: Number }) height!: number;
}
export class TemplateRevisionResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: Number }) number!: number;
  @ApiProperty({ type: DimensionsResponse }) dimensions!: DimensionsResponse;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}
export class TemplateResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: TemplateRevisionResponse }) currentRevision!: TemplateRevisionResponse;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class TemplateEnvelope {
  @ApiProperty({ type: TemplateResponse }) data!: TemplateResponse;
}
export class TemplatePageResponse {
  @ApiProperty({ type: [TemplateResponse] }) data!: TemplateResponse[];
  @ApiProperty({ type: PaginationResponse }) meta!: PaginationResponse;
}
export function templateResponse(result: TemplateResult): TemplateResponse {
  return {
    id: result.id,
    organizationId: result.organizationId,
    name: result.name,
    currentRevision: {
      id: result.currentRevision.id,
      number: result.currentRevision.number,
      dimensions: {
        width: result.currentRevision.dimensions.width,
        height: result.currentRevision.dimensions.height,
      },
      createdAt: result.currentRevision.createdAt,
    },
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}
