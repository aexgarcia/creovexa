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
import { PhotoType } from '../domain/photo-type.js';

const nullableText = (_object: unknown, value: unknown) => value !== undefined && value !== null;

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
  @ApiPropertyOptional({
    type: String,
    maxLength: 40,
    nullable: true,
    description: 'Nombre para el flyer. Sin él se usa el nombre completo.',
  })
  @ValidateIf(nullableText)
  @IsString()
  @MaxLength(40)
  shortName?: string | null;
  @ApiPropertyOptional({
    type: String,
    maxLength: 80,
    nullable: true,
    description: 'Marca de un tercero que vende la tienda.',
  })
  @ValidateIf(nullableText)
  @IsString()
  @MaxLength(80)
  productBrand?: string | null;
  @ApiPropertyOptional({
    type: [String],
    maxItems: 5,
    description: 'Hasta 5 características, por prioridad; la plantilla decide cuántas se muestran.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  keyAttributes?: string[];
  @ApiPropertyOptional({
    type: String,
    maxLength: 30,
    nullable: true,
    example: 'por kg',
  })
  @ValidateIf(nullableText)
  @IsString()
  @MaxLength(30)
  unit?: string | null;
  @ApiPropertyOptional({
    type: [String],
    maxItems: 1,
    uniqueItems: true,
    description: 'Una imagen del producto/servicio; [] para retirarla.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(1)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageAssetIds?: string[];
}
export class UploadProductImageRequest {
  @ApiProperty({ enum: PhotoType, enumName: 'PhotoType', description: 'Qué muestra la foto.' })
  @IsEnum(PhotoType)
  photoType!: PhotoType;
}
export class UpdateProductRequest extends PartialType(
  OmitType(CreateProductRequest, ['kind'] as const),
  { skipNullProperties: false },
) {}
