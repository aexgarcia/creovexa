import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsUUID } from 'class-validator';
export class UpdateTemplateRequest {
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() expectedRevisionId!: string;
}
