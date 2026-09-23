import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { PaginationRequest, paginationResponse } from '#app/presentation/http/pagination.dto';
import { validateRequest } from '#app/presentation/http/request-validation';
import { CreateCampaign } from '../application/use-cases/create-campaign.js';
import { GetCampaign } from '../application/use-cases/get-campaign.js';
import { ListCampaigns } from '../application/use-cases/list-campaigns.js';
import { CreateCampaignRequest, ApproveCampaignRequest } from './campaign.requests.js';
import { ApproveCampaign } from '../application/use-cases/approve-campaign.js';
import { CampaignEnvelope, CampaignPageResponse, campaignResponse } from './campaign.responses.js';

@ApiTags('Campañas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(
    @Inject(ApproveCampaign) private readonly approveCampaign: ApproveCampaign,
    @Inject(CreateCampaign) private readonly createCampaign: CreateCampaign,
    @Inject(GetCampaign) private readonly getCampaign: GetCampaign,
    @Inject(ListCampaigns) private readonly listCampaigns: ListCampaigns,
  ) {}

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprobar la revisión candidata de una campaña' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: ApproveCampaignRequest })
  @ApiOkResponse({ type: CampaignEnvelope })
  async approve(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Body(validateRequest(ApproveCampaignRequest)) body: ApproveCampaignRequest,
  ): Promise<CampaignEnvelope> {
    return {
      data: campaignResponse(
        await this.approveCampaign.execute({
          organizationId,
          campaignId,
          contentId: body.contentId,
        }),
      ),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Crear campaña en estado DRAFT' })
  @ApiBody({ type: CreateCampaignRequest })
  @ApiCreatedResponse({ type: CampaignEnvelope })
  async create(
    @OrganizationId() organizationId: string,
    @Body(validateRequest(CreateCampaignRequest)) body: CreateCampaignRequest,
  ): Promise<CampaignEnvelope> {
    return {
      data: campaignResponse(
        await this.createCampaign.execute({
          ...body,
          organizationId,
          promotion: body.promotion
            ? {
                ...body.promotion,
                startsAt: body.promotion.startsAt ? new Date(body.promotion.startsAt) : null,
                endsAt: body.promotion.endsAt ? new Date(body.promotion.endsAt) : null,
              }
            : null,
        }),
      ),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar campañas de la organización' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, maximum: 10000 })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: CampaignPageResponse })
  async list(
    @OrganizationId() organizationId: string,
    @Query(validateRequest(PaginationRequest)) query: PaginationRequest,
  ): Promise<CampaignPageResponse> {
    const result = await this.listCampaigns.execute({ organizationId, ...query });
    return { data: result.items.map(campaignResponse), meta: paginationResponse(result) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar campaña' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CampaignEnvelope })
  async get(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CampaignEnvelope> {
    return {
      data: campaignResponse(await this.getCampaign.execute({ organizationId, campaignId: id })),
    };
  }
}
