import { ApiProperty } from '@nestjs/swagger';
import { PaginationResponse } from '#app/presentation/http/pagination.dto';
import { Currency } from '#app/domain/value-objects/money';
import { ProductKind } from '../domain/product-kind.js';
import type { ProductResult } from '../application/product-result.js';

export class PriceResponse {
  @ApiProperty({ type: Number }) amountMinor!: number;
  @ApiProperty({ enum: Currency, enumName: 'Currency' }) currency!: Currency;
}
export class ProductResponse {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String, format: 'uuid' }) organizationId!: string;
  @ApiProperty({ enum: ProductKind, enumName: 'ProductKind' }) kind!: ProductKind;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) description!: string;
  @ApiProperty({ type: PriceResponse }) regularPrice!: PriceResponse;
  @ApiProperty({ type: [String] }) imageAssetIds!: string[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
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
    imageAssetIds: [...result.imageAssetIds],
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}
