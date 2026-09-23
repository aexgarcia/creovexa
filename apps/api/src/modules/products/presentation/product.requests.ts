import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Currency } from '#app/domain/value-objects/money';
import { ProductKind } from '../domain/product-kind.js';

export class PriceRequest {
  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    example: 1990,
    description: 'Importe entero en unidades menores; 1990 PEN representa S/ 19.90.',
  })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' })
  @IsEnum(Currency)
  currency!: Currency;
}
export class CreateProductRequest {
  @ApiProperty({ enum: ProductKind, enumName: 'ProductKind' })
  @IsEnum(ProductKind)
  kind!: ProductKind;
  @ApiProperty({ type: String, maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name!: string;
  @ApiPropertyOptional({ type: String, maxLength: 5000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  description?: string;
  @ApiProperty({ type: PriceRequest })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PriceRequest)
  regularPrice!: PriceRequest;
  @ApiPropertyOptional({ type: [String], maxItems: 20, uniqueItems: true })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageAssetIds?: string[];
}
export class UpdateProductRequest extends PartialType(
  OmitType(CreateProductRequest, ['kind'] as const),
  { skipNullProperties: false },
) {}
