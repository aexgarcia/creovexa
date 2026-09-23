import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
import type { Pagination } from '#app/domain/pagination';

function decimal(value: unknown): unknown {
  return typeof value === 'string' && /^[1-9][0-9]*$/.test(value) ? Number(value) : value;
}
export class PaginationRequest {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1, maximum: 10000 })
  @Transform(({ value }: { value: unknown }) => decimal(value))
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Transform(({ value }: { value: unknown }) => decimal(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class PaginationResponse {
  @ApiProperty({ type: Number }) page!: number;
  @ApiProperty({ type: Number }) limit!: number;
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) totalPages!: number;
}
export function paginationResponse(input: Pagination & { total: number }): PaginationResponse {
  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages: Math.ceil(input.total / input.limit),
  };
}
