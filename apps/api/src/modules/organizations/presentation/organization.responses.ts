import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '#app/domain/value-objects/money';
import type { OrganizationResult } from '../application/organization-result.js';
import { BrandColorsRequest, ContactRequest } from './organization.requests.js';
import { TYPOGRAPHIES, type Typography } from '../domain/value-objects/brand-voice.js';

export class RegionResponse {
  @ApiProperty({ type: String, example: 'PE' }) country!: string;
  @ApiProperty({ type: String, example: 'es-PE' }) locale!: string;
  @ApiProperty({ type: String, example: 'America/Lima' }) timeZone!: string;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
}

export class LogoTraitsResponse {
  @ApiProperty({ type: Boolean, description: 'Si la tinta del logo es oscura.' }) isDark!: boolean;
  @ApiProperty({ type: BrandColorsRequest, description: 'Colores propuestos desde el logo.' })
  suggestedColors!: BrandColorsRequest;
}

export class OrganizationResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: String, nullable: true }) brandTone!: string | null;
  @ApiProperty({ type: String, nullable: true }) industry!: string | null;
  @ApiProperty({ type: RegionResponse }) region!: RegionResponse;
  @ApiProperty({
    type: BrandColorsRequest,
    nullable: true,
    description: 'Los que eligió el usuario; null si usa los del logo.',
  })
  brandColors!: BrandColorsRequest | null;
  @ApiProperty({
    type: BrandColorsRequest,
    nullable: true,
    description: 'Los que usa el flyer: los del usuario o, si no hay, los del logo.',
  })
  effectiveBrandColors!: BrandColorsRequest | null;
  @ApiProperty({ enum: TYPOGRAPHIES, nullable: true }) typography!: Typography | null;
  @ApiProperty({ type: [String] }) visualStyle!: string[];
  @ApiProperty({ type: ContactRequest, nullable: true }) contact!: ContactRequest | null;
  @ApiProperty({ type: String, nullable: true }) defaultLegalText!: string | null;
  @ApiProperty({ type: [String] }) forbiddenWords!: string[];
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) logoAssetId!: string | null;
  @ApiProperty({ type: String, nullable: true }) logoUrl!: string | null;
  @ApiProperty({
    type: LogoTraitsResponse,
    nullable: true,
    description: 'null sin logo, o con un logo subido antes de que existiera el análisis.',
  })
  logoTraits!: LogoTraitsResponse | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}
export class OrganizationEnvelope {
  @ApiProperty({ type: OrganizationResponse }) data!: OrganizationResponse;
}
export function organizationResponse(result: OrganizationResult): OrganizationResponse {
  return {
    ...result,
    logoUrl: result.logoAssetId ? `/organization/logos/${result.logoAssetId}` : null,
  };
}
