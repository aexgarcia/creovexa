import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
  Post,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MAX_IMAGE_BYTES } from '#app/infrastructure/image-files';
import { SaveOrganizationLogo } from '../application/use-cases/save-organization-logo.js';
import { GetOrganizationLogo } from '../application/use-cases/get-organization-logo.js';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { validateRequest } from '#app/presentation/http/request-validation';
import { GetOrganization } from '../application/use-cases/get-organization.js';
import { UpdateOrganizationProfile } from '../application/use-cases/update-organization-profile.js';
import { UpdateOrganizationRequest } from './organization.requests.js';
import { OrganizationEnvelope, organizationResponse } from './organization.responses.js';
@ApiTags('Organización')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('organization')
export class OrganizationController {
  constructor(
    @Inject(GetOrganization) private readonly getOrganization: GetOrganization,
    @Inject(UpdateOrganizationProfile)
    private readonly updateOrganization: UpdateOrganizationProfile,
    @Inject(SaveOrganizationLogo) private readonly saveLogo: SaveOrganizationLogo,
    @Inject(GetOrganizationLogo) private readonly getLogo: GetOrganizationLogo,
  ) {}
  @Post('logo')
  @ApiOperation({ summary: 'Subir o reemplazar el logo de la organización' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['logo'],
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: OrganizationEnvelope })
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  async uploadLogo(
    @OrganizationId() organizationId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<OrganizationEnvelope> {
    if (!file) throw new BadRequestException();
    return {
      data: organizationResponse(
        await this.saveLogo.execute({ organizationId, bytes: file.buffer }),
      ),
    };
  }
  @Get('logos/:assetId')
  @ApiOperation({ summary: 'Leer un logo dentro de la organización activa' })
  async readLogo(
    @OrganizationId() organizationId: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const logo = await this.getLogo.execute({ organizationId, assetId });
    response.setHeader('Content-Type', logo.contentType);
    response.setHeader('Content-Length', logo.bytes.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(logo.bytes);
  }
  @Get()
  @ApiOkResponse({ type: OrganizationEnvelope })
  async get(@OrganizationId() organizationId: string): Promise<OrganizationEnvelope> {
    return { data: organizationResponse(await this.getOrganization.execute({ organizationId })) };
  }
  @Patch()
  @ApiBody({ type: UpdateOrganizationRequest })
  @ApiOkResponse({ type: OrganizationEnvelope })
  async update(
    @OrganizationId() organizationId: string,
    @Body(validateRequest(UpdateOrganizationRequest)) body: UpdateOrganizationRequest,
  ): Promise<OrganizationEnvelope> {
    if (Object.values(body).every((value) => value === undefined)) throw new BadRequestException();
    return {
      data: organizationResponse(
        await this.updateOrganization.execute({ ...body, organizationId }),
      ),
    };
  }
}
