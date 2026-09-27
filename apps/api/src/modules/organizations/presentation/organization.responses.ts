import { ApiProperty } from '@nestjs/swagger';
export class OrganizationResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String, nullable: true }) brandTone!: string | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) logoAssetId!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class OrganizationEnvelope {
  @ApiProperty({ type: OrganizationResponse }) data!: OrganizationResponse;
}
