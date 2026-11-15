import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Inject,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
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
import { GetCampaignCopy } from '../application/use-cases/generate-campaign-copy.js';
import { RequestCampaignCopy } from '../application/use-cases/request-campaign-copy.js';

const STATUSES = ['PENDING', 'RUNNING', 'READY', 'FAILED'];

class CampaignCopyContent {
  @ApiProperty() headline!: string;
  @ApiProperty() caption!: string;
  @ApiProperty() cta!: string;
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty() imagePrompt!: string;
}
class CampaignCopyResponse {
  @ApiProperty({ format: 'uuid' }) generationId!: string;
  @ApiProperty({ enum: STATUSES }) status!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Motivo cuando status es FAILED' })
  failureCode!: string | null;
  @ApiProperty({ type: CampaignCopyContent, nullable: true, description: 'Presente si READY' })
  copy!: CampaignCopyContent | null;
}
class CampaignCopyEnvelope {
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
}
