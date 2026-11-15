import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Currency } from '#app/domain/value-objects/money';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const present = (_o: unknown, value: unknown) => value !== undefined;

export class RegionRequest {
  @ApiPropertyOptional({ type: String, example: 'PE', description: 'ISO 3166-1 alfa-2.' })
  @ValidateIf(present)
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  country?: string;
  @ApiPropertyOptional({ type: String, example: 'es-PE', maxLength: 35 })
  @ValidateIf(present)
  @IsString()
  @MaxLength(35)
  locale?: string;
  @ApiPropertyOptional({ type: String, example: 'America/Lima', maxLength: 64 })
  @ValidateIf(present)
  @IsString()
  @MaxLength(64)
  timeZone?: string;
  @ApiPropertyOptional({ enum: Currency, enumName: 'Currency' })
  @ValidateIf(present)
  @IsEnum(Currency)
  currency?: Currency;
}

export class BrandColorsRequest {
  @ApiProperty({ type: String, example: '#5B3A29' }) @Matches(HEX) primary!: string;
  @ApiProperty({ type: String, example: '#C98B4E' }) @Matches(HEX) secondary!: string;
  @ApiProperty({ type: String, example: '#E4572E' }) @Matches(HEX) accent!: string;
  @ApiProperty({ type: String, example: '#F7F1E8' }) @Matches(HEX) lightBackground!: string;
  @ApiProperty({ type: String, example: '#1E120D' }) @Matches(HEX) darkBackground!: string;
}

export class UpdateOrganizationRequest {
  @ApiPropertyOptional({ type: String, maxLength: 200 })
  @ValidateIf(present)
  @IsString()
  @MaxLength(200)
  name?: string;
  @ApiPropertyOptional({ type: String, maxLength: 5000 })
  @ValidateIf(present)
  @IsString()
  @MaxLength(5000)
  description?: string;
  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(200)
  brandTone?: string | null;
  @ApiPropertyOptional({
    type: String,
    maxLength: 80,
    nullable: true,
    description: 'Rubro del negocio, por ejemplo "Cafetería".',
  })
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(80)
  industry?: string | null;
  @ApiPropertyOptional({
    type: RegionRequest,
    description: 'Solo cambian los campos enviados.',
  })
  @ValidateIf(present)
  @IsObject()
  @ValidateNested()
  @Type(() => RegionRequest)
  region?: RegionRequest;
  @ApiPropertyOptional({
    type: BrandColorsRequest,
    nullable: true,
    description: 'null vuelve a los colores que propone el logo.',
  })
  @ValidateIf((_o, value: unknown) => value !== undefined && value !== null)
  @IsObject()
  @ValidateNested()
  @Type(() => BrandColorsRequest)
  brandColors?: BrandColorsRequest | null;
}
