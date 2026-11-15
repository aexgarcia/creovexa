import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  FLYER_BACKGROUNDS,
  FLYER_COMPOSITIONS,
  FLYER_FORMATS,
  FLYER_MODES,
  FLYER_STYLES,
  LOGO_POSITIONS,
  MAX_KEY_ATTRIBUTES,
  TEXT_DENSITIES,
  type FlyerBackground,
  type FlyerComposition,
  type FlyerFormat,
  type FlyerMode,
  type FlyerStyle,
  type LogoPosition,
  type TextDensity,
} from '#app/domain/value-objects/flyer-design';

export class TemplateElementsRequest {
  @ApiProperty({ type: Boolean }) @IsBoolean() logo!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() headline!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() subheadline!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() productName!: boolean;
  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: MAX_KEY_ATTRIBUTES,
    description: 'Cuántas características del producto mostrar.',
  })
  @IsInt()
  @Min(0)
  @Max(MAX_KEY_ATTRIBUTES)
  keyAttributes!: number;
  @ApiProperty({ type: Boolean }) @IsBoolean() regularPrice!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() promotionPrice!: boolean;
  @ApiProperty({ type: Boolean, description: 'Fechas de la promoción.' })
  @IsBoolean()
  validity!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() cta!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() contact!: boolean;
  @ApiProperty({ type: Boolean }) @IsBoolean() legalText!: boolean;
}

export class TemplateDesignRequest {
  @ApiProperty({
    enum: FLYER_FORMATS,
    description: 'SQUARE 1080 × 1080, PORTRAIT 1080 × 1350, STORY 1080 × 1920.',
  })
  @IsIn(FLYER_FORMATS)
  format!: FlyerFormat;
  @ApiProperty({ enum: FLYER_COMPOSITIONS })
  @IsIn(FLYER_COMPOSITIONS)
  composition!: FlyerComposition;
  @ApiProperty({ enum: FLYER_STYLES }) @IsIn(FLYER_STYLES) style!: FlyerStyle;
  @ApiProperty({ enum: FLYER_MODES }) @IsIn(FLYER_MODES) mode!: FlyerMode;
  @ApiProperty({ enum: FLYER_BACKGROUNDS }) @IsIn(FLYER_BACKGROUNDS) background!: FlyerBackground;
  @ApiProperty({ enum: LOGO_POSITIONS }) @IsIn(LOGO_POSITIONS) logoPosition!: LogoPosition;
  @ApiProperty({ enum: TEXT_DENSITIES }) @IsIn(TEXT_DENSITIES) textDensity!: TextDensity;
  @ApiProperty({ type: TemplateElementsRequest })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => TemplateElementsRequest)
  elements!: TemplateElementsRequest;
}
