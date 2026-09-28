import { PublicationHistoryPage, PublicationAttemptPage } from './publication-history.responses.js';
import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { PaginationRequest, paginationResponse } from '#app/presentation/http/pagination.dto';
import { validateRequest } from '#app/presentation/http/request-validation';
import {
  ListPublicationHistory,
  ListPublicationAttempts,
} from '../application/list-publication-history.js';
@ApiTags('Publicaciones')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('publications')
export class PublicationHistoryController {
  constructor(
    @Inject(ListPublicationHistory) private readonly list: ListPublicationHistory,
    @Inject(ListPublicationAttempts) private readonly attempts: ListPublicationAttempts,
  ) {}
  @Get()
  @ApiOkResponse({
    type: PublicationHistoryPage,
    description: 'Publicaciones de la organización, ordenadas por fecha descendente.',
  })
  async get(
    @OrganizationId() organizationId: string,
    @Query(validateRequest(PaginationRequest)) query: PaginationRequest,
  ) {
    const result = await this.list.execute({ organizationId, ...query });
    return { data: result.items, meta: paginationResponse(result) };
  }
  @Get(':id/attempts')
  @ApiOkResponse({
    type: PublicationAttemptPage,
    description: 'Historial paginado de intentos y sus resultados, más reciente primero.',
  })
  async history(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) publicationId: string,
    @Query(validateRequest(PaginationRequest)) query: PaginationRequest,
  ) {
    const result = await this.attempts.execute({ organizationId, publicationId, ...query });
    return { data: result.items, meta: paginationResponse(result) };
  }
}
