import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Currency } from '#app/domain/value-objects/money';
import {
  CampaignObjective,
  INSTRUCTIONS_MAX_LENGTH,
  OCCASION_MAX_LENGTH,
} from '../domain/campaign-objective.js';
import { CopyChannel } from '../domain/copy-channel.js';
import { CONDITIONS_MAX_LENGTH } from '../domain/value-objects/promotion.js';

export class ApproveCampaignRequest {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  contentId!: string;
}

// Recuperar una versión anterior (ADR-0026).
export class RestoreCampaignVersionRequest {
  @ApiProperty({
    type: Number,
    minimum: 0,
    description: 'La versión de la campaña que se estaba viendo, tal como la devolvió la API.',
  })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;
}

export class PromotionRequest {
  @ApiProperty({ type: Number, minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' })
  @IsEnum(Currency)
  currency!: Currency;
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'ISO 8601 con zona horaria.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/)
  startsAt?: string;
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'ISO 8601 con zona horaria.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/)
  endsAt?: string;
  @ApiPropertyOptional({
    type: String,
    maxLength: CONDITIONS_MAX_LENGTH,
    nullable: true,
    description: 'Se imprimen tal cual en el flyer, como texto legal.',
  })
  @ValidateIf((_object, value: unknown) => value != null)
  @IsString()
  @MaxLength(CONDITIONS_MAX_LENGTH)
  conditions?: string | null;
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Muestra el porcentaje de descuento, que calcula el sistema. Por defecto false.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  showDiscount?: boolean;
}

export class CreateCampaignRequest {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() productId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() templateId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() templateRevisionId!: string;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) title!: string;
  @ApiPropertyOptional({
    enum: CampaignObjective,
    enumName: 'CampaignObjective',
    description: 'Por defecto PROMOTION.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(CampaignObjective)
  objective?: CampaignObjective;
  @ApiPropertyOptional({
    type: String,
    maxLength: OCCASION_MAX_LENGTH,
    nullable: true,
    description: 'Fecha o motivo especial, por ejemplo "Navidad".',
  })
  @ValidateIf((_object, value: unknown) => value != null)
  @IsString()
  @MaxLength(OCCASION_MAX_LENGTH)
  occasion?: string | null;
  @ApiPropertyOptional({
    enum: CopyChannel,
    enumName: 'CopyChannel',
    description:
      'Canal principal del copy: cambia la longitud del caption y los hashtags. Por defecto INSTAGRAM.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(CopyChannel)
  channel?: CopyChannel;
  @ApiPropertyOptional({
    type: String,
    maxLength: INSTRUCTIONS_MAX_LENGTH,
    description: 'Contexto visual para la IA; no cambia los textos del flyer.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(INSTRUCTIONS_MAX_LENGTH)
  instructions?: string;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) cta!: string;
  @ApiPropertyOptional({ type: PromotionRequest })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PromotionRequest)
  promotion?: PromotionRequest;
}

export class UpdateCampaignRequest extends CreateCampaignRequest {
  @ApiProperty({
    type: Number,
    minimum: 0,
    description: 'La versión de la campaña que se editó, tal como la devolvió la API.',
  })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  expectedVersion!: number;
}
