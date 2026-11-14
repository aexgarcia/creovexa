import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { validateRequest } from '#app/presentation/http/request-validation';
import {
  GetCampaignImage,
  RequestCampaignImage,
  type CampaignImageStatus,
} from '../application/use-cases/request-campaign-image.js';

export class GenerateCampaignImageRequest {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() generationId!: string;
}
class CampaignImageResponse {
  @ApiProperty({ type: String, format: 'uuid' }) generationId!: string;
  @ApiProperty({ enum: ['PENDING', 'RUNNING', 'READY', 'FAILED'] }) status!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Motivo cuando status es FAILED' })
  failureCode!: string | null;
  @ApiProperty({ type: String, format: 'uuid', nullable: true }) contentId!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Presente si READY' })
  finalAssetUrl!: string | null;
}
class CampaignImageEnvelope {
  @ApiProperty({ type: CampaignImageResponse, nullable: true }) data!: CampaignImageResponse | null;
}

function response(campaignId: string, status: CampaignImageStatus): CampaignImageResponse {
  return {
    generationId: status.generationId,
    status: status.status,
    failureCode: status.failureCode,
    contentId: status.content?.id ?? null,
    finalAssetUrl: status.content
      ? `/campaigns/${campaignId}/assets/${status.content.assetIds[0]}`
      : null,
  };
}

@ApiTags('Campañas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('campaigns')
export class CampaignImageController {
  constructor(
    @Inject(RequestCampaignImage) private readonly requestImage: RequestCampaignImage,
    @Inject(GetCampaignImage) private readonly getImage: GetCampaignImage,
  ) {}
  @Post(':id/image')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Solicitar el flyer final; se genera en segundo plano y se consulta con GET',
  })
  @ApiBody({ type: GenerateCampaignImageRequest })
  @ApiAcceptedResponse({ type: CampaignImageEnvelope })
  async request(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Body(validateRequest(GenerateCampaignImageRequest)) body: GenerateCampaignImageRequest,
  ): Promise<CampaignImageEnvelope> {
    const status = await this.requestImage.execute({
      organizationId,
      campaignId,
      generationId: body.generationId,
    });
    return { data: response(campaignId, status) };
  }
  @Get(':id/image')
  @ApiOperation({ summary: 'Consultar el estado del flyer de la generación vigente' })
  @ApiOkResponse({ type: CampaignImageEnvelope })
  async get(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignImageEnvelope> {
    const status = await this.getImage.execute({ organizationId, campaignId });
    return { data: status && response(campaignId, status) };
  }
}
