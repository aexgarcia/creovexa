import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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

export class ApproveCampaignRequest {
  @ApiProperty({ type: String, format: 'uuid' })
  @IsUUID()
  contentId!: string;
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
}

export class CreateCampaignRequest {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() productId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() templateId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() templateRevisionId!: string;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) title!: string;
  @ApiPropertyOptional({ type: String, maxLength: 5000 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  instructions?: string;
  @ApiProperty({ type: String, maxLength: 200 }) @IsString() @MaxLength(200) cta!: string;
  @ApiPropertyOptional({ type: PromotionRequest })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => PromotionRequest)
  promotion?: PromotionRequest;
}
