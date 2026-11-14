import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { TemplateDesignRequest } from './template-design.request.js';

export class DimensionsRequest {
  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: 2147483647,
    example: 1080,
    description: 'Formato inicial soportado: 1080 × 1080.',
  })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  width!: number;
  @ApiProperty({ type: Number, minimum: 1, maximum: 2147483647, example: 1080 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  height!: number;
}
export class CreateTemplateRequest {
  @ApiProperty({ type: TemplateDesignRequest, required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateDesignRequest)
  design?: TemplateDesignRequest;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) name!: string;
  @ApiProperty({ type: DimensionsRequest })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => DimensionsRequest)
  dimensions!: DimensionsRequest;
}
