import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  ParseUUIDPipe,
  Inject,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiProperty,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from '#app/presentation/http/error-response.dto';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { validateRequest } from '#app/presentation/http/request-validation';
import { IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { HEADLINE_MAX_LENGTH, SUBHEADLINE_MAX_LENGTH } from '../application/copy-policy.js';
import { UpdateCampaignCopy } from '../application/use-cases/update-campaign-copy.js';
import { GetCampaignCopy } from '../application/use-cases/generate-campaign-copy.js';
import { RequestCampaignCopy } from '../application/use-cases/request-campaign-copy.js';

const STATUSES = ['PENDING', 'RUNNING', 'READY', 'FAILED'];

class CampaignCopyContent {
  @ApiProperty({ description: 'Titular del flyer' }) headline!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Subtítulo del flyer' })
  subheadline!: string | null;
  @ApiProperty({ description: 'Texto de la publicación' }) caption!: string;
  @ApiProperty() cta!: string;
  @ApiProperty({ type: [String] }) hashtags!: string[];
}
export class UpdateCampaignCopyRequest {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() generationId!: string;
  @ApiProperty({ maxLength: HEADLINE_MAX_LENGTH })
  @IsString()
  @MaxLength(HEADLINE_MAX_LENGTH)
  headline!: string;
  @ApiProperty({ type: String, nullable: true, maxLength: SUBHEADLINE_MAX_LENGTH })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(SUBHEADLINE_MAX_LENGTH)
  subheadline!: string | null;
}
class CampaignCopyResponse {
  @ApiProperty({ format: 'uuid' }) generationId!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Motivo cuando status es FAILED' })
  failureCode!: string | null;
  @ApiProperty({ type: CampaignCopyContent, nullable: true, description: 'Presente si READY' })
  copy!: CampaignCopyContent | null;
}
export class CampaignCopyEnvelope {
  @ApiProperty({ type: CampaignCopyResponse, nullable: true }) data!: CampaignCopyResponse | null;
}
@ApiTags('Campaign copy')
@Controller('campaigns/:id/copy')
@UseGuards(DevelopmentOrganizationGuard)
@ApiParam({ name: 'id', type: String, format: 'uuid' })
@ApiErrors()
export class CampaignCopyController {
  constructor(
    @Inject(RequestCampaignCopy) private readonly requestCopy: RequestCampaignCopy,
    @Inject(GetCampaignCopy) private readonly getCopy: GetCampaignCopy,
    @Inject(UpdateCampaignCopy) private readonly updateCopy: UpdateCampaignCopy,
  ) {}
  @Post()
  @HttpCode(202)
  @ApiOperation({
    summary: 'Solicitar el copy; se genera en segundo plano y se consulta con GET',
  })
  @ApiAcceptedResponse({ type: CampaignCopyEnvelope })
  @ApiResponse({ status: 503, type: ErrorResponse, description: 'Proveedor no configurado' })
  async request(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignCopyEnvelope> {
    return { data: await this.requestCopy.execute({ organizationId, campaignId }) };
  }
  @Get()
  @ApiOperation({ summary: 'Consultar el estado y el copy de la generación vigente' })
  @ApiOkResponse({ type: CampaignCopyEnvelope })
  async get(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignCopyEnvelope> {
    return { data: await this.getCopy.execute({ organizationId, campaignId }) };
  }
  @Patch()
  @ApiOperation({
    summary: 'Corregir el titular y el subtítulo del flyer antes de pedir la imagen',
  })
  @ApiBody({ type: UpdateCampaignCopyRequest })
  @ApiOkResponse({ type: CampaignCopyEnvelope })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Body(validateRequest(UpdateCampaignCopyRequest)) body: UpdateCampaignCopyRequest,
  ): Promise<CampaignCopyEnvelope> {
    return {
      data: await this.updateCopy.execute({
        organizationId,
        campaignId,
        generationId: body.generationId,
        headline: body.headline,
        subheadline: body.subheadline,
      }),
    };
  }
}
