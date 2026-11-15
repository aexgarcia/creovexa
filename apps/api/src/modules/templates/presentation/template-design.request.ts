import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsIn, IsObject, ValidateNested } from 'class-validator';

export class TemplateElementsRequest {
  @ApiProperty({ type: Boolean }) @IsBoolean() showLogo!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() showRegularPrice!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() showPromotionPrice!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() showHeadline!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() showCta!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() showMainImage!: boolean;
}

export class TemplateDesignRequest {
  @ApiProperty({ enum: ['CLASSIC', 'PRODUCT_FOCUS'] }) @IsIn(['CLASSIC', 'PRODUCT_FOCUS']) layout!:
    | 'CLASSIC'
    | 'PRODUCT_FOCUS';
  @ApiProperty({ enum: ['BLUE', 'CORAL'] }) @IsIn(['BLUE', 'CORAL']) palette!: 'BLUE' | 'CORAL';
  @ApiProperty({ type: TemplateElementsRequest })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateElementsRequest)
  settings!: TemplateElementsRequest;
}
