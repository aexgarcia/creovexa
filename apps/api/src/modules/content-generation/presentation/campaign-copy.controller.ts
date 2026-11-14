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
import {
  GenerateCampaignCopy,
  GetCampaignCopy,
} from '../application/use-cases/generate-campaign-copy.js';
class CampaignCopyResponse {
  @ApiProperty({ format: 'uuid' }) generationId!: string;
  @ApiProperty() headline!: string;
  @ApiProperty() caption!: string;
  @ApiProperty() cta!: string;
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty() imagePrompt!: string;
}
class CampaignCopyEnvelope {
  @ApiProperty({ type: CampaignCopyResponse, nullable: true }) data!: CampaignCopyResponse | null;
}
@ApiTags('Campaign copy')
@Controller('campaigns/:id/copy')
@UseGuards(DevelopmentOrganizationGuard)
@ApiParam({ name: 'id', type: String, format: 'uuid' })
@ApiErrors()
@ApiResponse({ status: 502, type: ErrorResponse, description: 'Salida rechazada o inválida' })
@ApiResponse({ status: 504, type: ErrorResponse, description: 'Tiempo de generación agotado' })
export class CampaignCopyController {
  constructor(
    @Inject(GenerateCampaignCopy) private readonly generateCopy: GenerateCampaignCopy,
    @Inject(GetCampaignCopy) private readonly getCopy: GetCampaignCopy,
  ) {}
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Generar copy intermedio; no aprueba ni publica la campaña' })
  @ApiOkResponse({ type: CampaignCopyEnvelope })
  async generate(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignCopyEnvelope> {
    return { data: await this.generateCopy.execute({ organizationId, campaignId }) };
  }
  @Get()
  @ApiOperation({ summary: 'Consultar el copy de la generación vigente' })
  @ApiOkResponse({ type: CampaignCopyEnvelope })
  async get(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignCopyEnvelope> {
    return { data: await this.getCopy.execute({ organizationId, campaignId }) };
  }
}
