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
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
  ApiProduces,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { Response } from 'express';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { validateRequest } from '#app/presentation/http/request-validation';
import { GenerateCampaignImage } from '../application/use-cases/generate-campaign-image.js';
import { GetCampaignFinalAsset } from '../application/use-cases/get-campaign-final-asset.js';
export class GenerateCampaignImageRequest {
  @ApiProperty({ type: String, format: 'uuid' }) @IsUUID() generationId!: string;
}
class CampaignImageResponse {
  @ApiProperty({ type: String, format: 'uuid' }) contentId!: string;
  @ApiProperty({ type: String, format: 'uuid' }) generationId!: string;
  @ApiProperty({ type: String }) finalAssetUrl!: string;
}
class CampaignImageEnvelope {
  @ApiProperty({ type: CampaignImageResponse }) data!: CampaignImageResponse;
}
@ApiTags('Campañas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('campaigns')
export class CampaignImageController {
  constructor(
    @Inject(GenerateCampaignImage) private readonly generate: GenerateCampaignImage,
    @Inject(GetCampaignFinalAsset) private readonly getAsset: GetCampaignFinalAsset,
  ) {}
  @Post(':id/image')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generar el flyer final a partir del copy y la foto fijados' })
  @ApiBody({ type: GenerateCampaignImageRequest })
  @ApiOkResponse({ type: CampaignImageEnvelope })
  async generateImage(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Body(validateRequest(GenerateCampaignImageRequest)) body: GenerateCampaignImageRequest,
  ): Promise<CampaignImageEnvelope> {
    const content = await this.generate.execute({
      organizationId,
      campaignId,
      generationId: body.generationId,
    });
    return {
      data: {
        contentId: content.id,
        generationId: content.generationId,
        finalAssetUrl: `/campaigns/${campaignId}/assets/${content.assetIds[0]}`,
      },
    };
  }
  @Get(':id/assets/:assetId')
  @ApiOperation({ summary: 'Leer el flyer final de la revisión candidata de campaña' })
  @ApiProduces('image/png')
  async readFinal(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.getAsset.execute({ organizationId, campaignId, assetId });
    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Content-Length', result.bytes.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(result.bytes);
  }
}
