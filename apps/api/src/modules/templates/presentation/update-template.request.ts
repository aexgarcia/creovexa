import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, IsUUID, ValidateIf, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateDesignRequest } from './template-design.request.js';
export class UpdateTemplateRequest {
  @ApiProperty({ type: TemplateDesignRequest, required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateDesignRequest)
  design?: TemplateDesignRequest;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() expectedRevisionId!: string;
}
