import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { PaginationRequest, paginationResponse } from '#app/presentation/http/pagination.dto';
import { validateRequest } from '#app/presentation/http/request-validation';
import { CreateCampaign } from '../application/use-cases/create-campaign.js';
import { GetCampaign } from '../application/use-cases/get-campaign.js';
import { GetCampaignFinalAsset } from '../application/use-cases/get-campaign-final-asset.js';
import { ListCampaigns } from '../application/use-cases/list-campaigns.js';
import {
  CreateCampaignRequest,
  ApproveCampaignRequest,
  UpdateCampaignRequest,
  RestoreCampaignVersionRequest,
  type PromotionRequest,
} from './campaign.requests.js';
import { UpdateCampaignDraft } from '../application/use-cases/update-campaign-draft.js';
import { ApproveCampaign } from '../application/use-cases/approve-campaign.js';
import {
  ListCampaignVersions,
  RestoreCampaignVersion,
} from '../application/use-cases/campaign-versions.js';
import {
  CampaignEnvelope,
  CampaignPageResponse,
  CampaignVersionsEnvelope,
  campaignResponse,
  campaignVersionResponse,
} from './campaign.responses.js';

function promotionInput(promotion: PromotionRequest | undefined) {
  return promotion
    ? {
        ...promotion,
        startsAt: promotion.startsAt ? new Date(promotion.startsAt) : null,
        endsAt: promotion.endsAt ? new Date(promotion.endsAt) : null,
      }
    : null;
}

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
    @Inject(GetCampaignFinalAsset) private readonly getFinalAsset: GetCampaignFinalAsset,
    @Inject(UpdateCampaignDraft) private readonly updateDraft: UpdateCampaignDraft,
    @Inject(ListCampaignVersions) private readonly listVersions: ListCampaignVersions,
    @Inject(RestoreCampaignVersion) private readonly restoreVersion: RestoreCampaignVersion,
  ) {}

  @Get(':id/versions')
  @ApiOperation({ summary: 'Historial de versiones del flyer, de la más nueva a la más antigua' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: CampaignVersionsEnvelope })
  async versions(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignVersionsEnvelope> {
    const versions = await this.listVersions.execute({ organizationId, campaignId });
    return { data: versions.map((version) => campaignVersionResponse(campaignId, version)) };
  }

  @Post(':id/versions/:generationId/restore')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Volver a una versión anterior del flyer',
    description: 'Su contenido queda pendiente de aprobación; quita la aprobación que hubiera.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiParam({ name: 'generationId', type: String, format: 'uuid' })
  @ApiBody({ type: RestoreCampaignVersionRequest })
  @ApiOkResponse({ type: CampaignEnvelope })
  async restore(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Param('generationId', new ParseUUIDPipe()) generationId: string,
    @Body(validateRequest(RestoreCampaignVersionRequest)) body: RestoreCampaignVersionRequest,
  ): Promise<CampaignEnvelope> {
    return {
      data: campaignResponse(
        await this.restoreVersion.execute({
          organizationId,
          campaignId,
          generationId,
          expectedVersion: body.expectedVersion,
        }),
      ),
    };
  }

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
          promotion: promotionInput(body.promotion),
        }),
      ),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar una campaña en borrador',
    description: 'Reemplaza el brief completo. expectedVersion evita pisar los cambios de otro.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateCampaignRequest })
  @ApiOkResponse({ type: CampaignEnvelope })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Body(validateRequest(UpdateCampaignRequest)) body: UpdateCampaignRequest,
  ): Promise<CampaignEnvelope> {
    return {
      data: campaignResponse(
        await this.updateDraft.execute({
          ...body,
          organizationId,
          campaignId,
          promotion: promotionInput(body.promotion),
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

  @Get(':id/assets/:assetId')
  @ApiOperation({ summary: 'Leer el flyer final de la revisión candidata de campaña' })
  @ApiProduces('image/png')
  async readFinalAsset(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.getFinalAsset.execute({ organizationId, campaignId, assetId });
    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Content-Length', result.bytes.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(result.bytes);
  }
}
