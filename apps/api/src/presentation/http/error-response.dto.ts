import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class ValidationDetailResponse {
  @ApiProperty({ type: String }) field!: string;
  @ApiProperty({ type: [String] }) rules!: string[];
}
export class ApiError {
  @ApiProperty({ type: String }) code!: string;
  @ApiProperty({ type: String }) message!: string;
  @ApiPropertyOptional({ type: [ValidationDetailResponse] }) details?: ValidationDetailResponse[];
}
export class ErrorResponse {
  @ApiProperty({ type: ApiError }) error!: ApiError;
  @ApiProperty({ type: String, format: 'uuid' }) requestId!: string;
}
