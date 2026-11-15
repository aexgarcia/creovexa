import {
  Controller,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { RegenerateCampaign } from '../application/use-cases/regenerate-campaign.js';
import { CampaignCopyEnvelope } from './campaign-copy.controller.js';

@ApiTags('Campañas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('campaigns')
export class CampaignRegenerationController {
  constructor(@Inject(RegenerateCampaign) private readonly regenerate: RegenerateCampaign) {}

  @Post(':id/regenerate')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Empezar otra versión del flyer con los datos actuales',
    description:
      'Reusa los textos de la versión anterior si siguen siendo válidos (status READY); si no, pide un copy nuevo en segundo plano (PENDING). La imagen se pide después.',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiAcceptedResponse({ type: CampaignCopyEnvelope })
  async request(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) campaignId: string,
  ): Promise<CampaignCopyEnvelope> {
    return { data: await this.regenerate.execute({ organizationId, campaignId }) };
  }
}
