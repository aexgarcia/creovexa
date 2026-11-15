import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn } from 'class-validator';
import { PaginationRequest } from './pagination.dto.js';

export class CatalogListRequest extends PaginationRequest {
  @ApiPropertyOptional({ enum: ['active', 'archived', 'all'], default: 'active' })
  @IsIn(['active', 'archived', 'all'])
  status: 'active' | 'archived' | 'all' = 'active';
}

export class ArchiveRequest {
  @ApiProperty({ type: Boolean })
  @IsBoolean()
  archived!: boolean;
}
