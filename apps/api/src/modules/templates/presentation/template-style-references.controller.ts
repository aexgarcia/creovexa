import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { Response } from 'express';
import { MAX_IMAGE_BYTES } from '#app/infrastructure/image-files';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { validateRequest } from '#app/presentation/http/request-validation';
import {
  AddTemplateStyleReference,
  GetTemplateStyleReference,
  RemoveTemplateStyleReference,
} from '../application/use-cases/template-style-references.js';
import { TemplateEnvelope, templateResponse } from './template.responses.js';

export class StyleReferenceRevisionRequest {
  @ApiProperty({
    type: String,
    format: 'uuid',
    description: 'Revisión vigente que se espera modificar.',
  })
  @IsUUID()
  expectedRevisionId!: string;
}

@ApiTags('Plantillas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('templates/:id/style-references')
export class TemplateStyleReferencesController {
  constructor(
    @Inject(AddTemplateStyleReference) private readonly add: AddTemplateStyleReference,
    @Inject(RemoveTemplateStyleReference) private readonly remove: RemoveTemplateStyleReference,
    @Inject(GetTemplateStyleReference) private readonly get: GetTemplateStyleReference,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Subir una referencia de estilo; crea una revisión nueva' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'expectedRevisionId'],
      properties: {
        image: { type: 'string', format: 'binary' },
        expectedRevisionId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiCreatedResponse({ type: TemplateEnvelope })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 1, parts: 2 },
    }),
  )
  async upload(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) templateId: string,
    @Body(validateRequest(StyleReferenceRevisionRequest)) body: StyleReferenceRevisionRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<TemplateEnvelope> {
    if (!file) throw new BadRequestException();
    return {
      data: templateResponse(
        await this.add.execute({
          organizationId,
          templateId,
          expectedRevisionId: body.expectedRevisionId,
          bytes: file.buffer,
        }),
      ),
    };
  }

  @Delete(':assetId')
  @ApiOperation({ summary: 'Quitar una referencia de estilo; crea una revisión nueva' })
  @ApiOkResponse({ type: TemplateEnvelope })
  async delete(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) templateId: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Query(validateRequest(StyleReferenceRevisionRequest)) query: StyleReferenceRevisionRequest,
  ): Promise<TemplateEnvelope> {
    return {
      data: templateResponse(
        await this.remove.execute({
          organizationId,
          templateId,
          assetId,
          expectedRevisionId: query.expectedRevisionId,
        }),
      ),
    };
  }

  @Get(':assetId')
  @ApiOperation({ summary: 'Leer una referencia de estilo de la plantilla' })
  async read(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) templateId: string,
    @Param('assetId', new ParseUUIDPipe()) assetId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.get.execute({ organizationId, templateId, assetId });
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('Content-Length', image.bytes.byteLength);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(image.bytes);
  }
}
