import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, ValidateIf } from 'class-validator';
export class UpdateOrganizationRequest {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(200)
  name?: string;
  @ApiPropertyOptional({ type: String, maxLength: 5000 })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  description?: string;
  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(200)
  brandTone?: string | null;
}
