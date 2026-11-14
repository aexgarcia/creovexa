import {
  Body,
  Controller,
  Post,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { validateRequest } from '#app/presentation/http/request-validation';
import { GenerateCampaignImage } from '../application/use-cases/generate-campaign-image.js';
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
  constructor(@Inject(GenerateCampaignImage) private readonly generate: GenerateCampaignImage) {}
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
}
