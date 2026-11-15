import { Patch } from '@nestjs/common';
import { UpdateTemplate } from '../application/use-cases/update-template.js';
import { UpdateTemplateRequest } from './update-template.request.js';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { PaginationRequest, paginationResponse } from '#app/presentation/http/pagination.dto';
import { validateRequest } from '#app/presentation/http/request-validation';
import { CreateTemplate } from '../application/use-cases/create-template.js';
import { GetTemplate } from '../application/use-cases/get-template.js';
import { ListTemplates } from '../application/use-cases/list-templates.js';
import { CreateTemplateRequest, UseBaseTemplateRequest } from './template.requests.js';
import {
  BaseTemplateListResponse,
  TemplateEnvelope,
  TemplatePageResponse,
  templateResponse,
} from './template.responses.js';
import { BASE_TEMPLATES, findBaseTemplate } from '../application/base-templates.js';
import { TemplateNotFoundError } from '../domain/errors/template.errors.js';

@ApiTags('Plantillas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('templates')
export class TemplatesController {
  constructor(
    @Inject(UpdateTemplate) private readonly updateTemplate: UpdateTemplate,
    @Inject(CreateTemplate) private readonly createTemplate: CreateTemplate,
    @Inject(GetTemplate) private readonly getTemplate: GetTemplate,
    @Inject(ListTemplates) private readonly listTemplates: ListTemplates,
  ) {}
  @Patch(':id')
  @ApiBody({ type: UpdateTemplateRequest })
  @ApiOkResponse({ type: TemplateEnvelope })
  async update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) templateId: string,
    @Body(validateRequest(UpdateTemplateRequest)) body: UpdateTemplateRequest,
  ): Promise<TemplateEnvelope> {
    return {
      data: templateResponse(
        await this.updateTemplate.execute({ ...body, organizationId, templateId }),
      ),
    };
  }
  @Post()
  @ApiOperation({ summary: 'Crear plantilla con su revisión inicial' })
  @ApiBody({ type: CreateTemplateRequest })
  @ApiCreatedResponse({ type: TemplateEnvelope })
  async create(
    @OrganizationId() organizationId: string,
    @Body(validateRequest(CreateTemplateRequest)) body: CreateTemplateRequest,
  ): Promise<TemplateEnvelope> {
    return {
      data: templateResponse(await this.createTemplate.execute({ ...body, organizationId })),
    };
  }
  @Get()
  @ApiOperation({ summary: 'Listar plantillas de la organización' })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1, maximum: 10000 })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: TemplatePageResponse })
  async list(
    @OrganizationId() organizationId: string,
    @Query(validateRequest(PaginationRequest)) query: PaginationRequest,
  ): Promise<TemplatePageResponse> {
    const result = await this.listTemplates.execute({ organizationId, ...query });
    return { data: result.items.map(templateResponse), meta: paginationResponse(result) };
  }
  @Get('base')
  @ApiOperation({ summary: 'Listar las plantillas base del sistema' })
  @ApiOkResponse({ type: BaseTemplateListResponse })
  listBase(): BaseTemplateListResponse {
    return {
      data: BASE_TEMPLATES.map((template) => ({
        ...template,
        design: {
          ...template.design,
          elements: { ...template.design.elements },
          styleReferenceAssetIds: [],
        },
      })),
    };
  }
  @Post('base/:key')
  @ApiOperation({ summary: 'Usar una plantilla base: crea una copia en la organización' })
  @ApiParam({ name: 'key', type: String, example: 'PROMOTION' })
  @ApiBody({ type: UseBaseTemplateRequest, required: false })
  @ApiCreatedResponse({ type: TemplateEnvelope })
  async useBase(
    @OrganizationId() organizationId: string,
    @Param('key') key: string,
    @Body(validateRequest(UseBaseTemplateRequest)) body: UseBaseTemplateRequest,
  ): Promise<TemplateEnvelope> {
    const template = findBaseTemplate(key);
    if (!template) throw new TemplateNotFoundError();
    return {
      data: templateResponse(
        await this.createTemplate.execute({
          organizationId,
          name: body.name ?? template.name,
          design: template.design,
        }),
      ),
    };
  }
  @Get(':id')
  @ApiOperation({ summary: 'Consultar plantilla y revisión vigente' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: TemplateEnvelope })
  async get(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<TemplateEnvelope> {
    return {
      data: templateResponse(await this.getTemplate.execute({ organizationId, templateId: id })),
    };
  }
}
