import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { PaginationRequest, paginationResponse } from '#app/presentation/http/pagination.dto';
import { validateRequest } from '#app/presentation/http/request-validation';
import { ListCampaignPublications } from '../application/use-cases/list-campaign-publications.js';
import { PublicationPageResponse, publicationResponse } from './publication.responses.js';

@ApiTags('Publicaciones')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('campaigns/:id/publications')
export class PublicationsController {
  constructor(
    @Inject(ListCampaignPublications) private readonly listPublications: ListCampaignPublications,
  ) {}
  @Get()
  @ApiOperation({ summary: 'Consultar estados y último intento por destino de la campaña' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, maximum: 10000 })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: PublicationPageResponse })
  async list(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Query(validateRequest(PaginationRequest)) query: PaginationRequest,
  ): Promise<PublicationPageResponse> {
    const result = await this.listPublications.execute({ organizationId, campaignId, ...query });
    return { data: result.items.map(publicationResponse), meta: paginationResponse(result) };
  }
}
