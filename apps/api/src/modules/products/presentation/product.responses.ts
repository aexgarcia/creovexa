import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
import { Currency } from '#app/domain/value-objects/money';
import { ProductKind } from '../domain/product-kind.js';
import { PhotoType } from '../domain/photo-type.js';
import type { ProductResult } from '../application/product-result.js';

export class PriceResponse {
  @ApiProperty({ type: Number }) amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
}
export class ProductImageResponse {
  @ApiProperty({
    enum: PhotoType,
    enumName: 'PhotoType',
    nullable: true,
    description: 'null en imágenes subidas antes de que se pidiera.',
  })
  photoType!: PhotoType | null;
  @ApiProperty({ type: Boolean, nullable: true }) hasTransparency!: boolean | null;
}
export class ProductResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ enum: ProductKind, enumName: 'ProductKind' }) kind!: ProductKind;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: PriceResponse }) regularPrice!: PriceResponse;
  @ApiProperty({ type: String, nullable: true, maxLength: 40 }) shortName!: string | null;
  @ApiProperty({ type: String, nullable: true }) productBrand!: string | null;
  @ApiProperty({ type: [String], maxItems: 5 }) keyAttributes!: string[];
  @ApiProperty({ type: String, nullable: true }) unit!: string | null;
  @ApiProperty({ type: [String], maxItems: 5 }) benefits!: string[];
  @ApiProperty({ type: String, nullable: true, maxLength: 200 }) idealFor!: string | null;
  @ApiProperty({ type: [String] }) imageAssetIds!: string[];
  @ApiProperty({ type: ProductImageResponse, nullable: true }) image!: ProductImageResponse | null;
  @ApiProperty({ type: String, nullable: true }) imageUrl!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) archivedAt!: string | null;
}
export class ProductEnvelope {
  @ApiProperty({ type: ProductResponse }) data!: ProductResponse;
}
export class ProductPageResponse {
  @ApiProperty({ type: [ProductResponse] }) data!: ProductResponse[];
  @ApiProperty({ type: PaginationResponse }) meta!: PaginationResponse;
}
export function productResponse(result: ProductResult): ProductResponse {
  return {
    id: result.id,
    organizationId: result.organizationId,
    kind: result.kind,
    name: result.name,
    description: result.description,
    regularPrice: {
      amountMinor: result.regularPrice.amountMinor,
      currency: result.regularPrice.currency,
    },
    shortName: result.shortName,
    productBrand: result.productBrand,
    keyAttributes: [...result.keyAttributes],
    unit: result.unit,
    benefits: [...result.benefits],
    idealFor: result.idealFor,
    imageAssetIds: [...result.imageAssetIds],
    image: result.image && { ...result.image },
    imageUrl:
      result.imageAssetIds.length === 1
        ? `/products/${result.id}/images/${result.imageAssetIds[0]}`
        : null,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    archivedAt: result.archivedAt,
  };
}
