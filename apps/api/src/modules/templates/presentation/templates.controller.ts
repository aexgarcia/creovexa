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
import { CreateTemplateRequest } from './template.requests.js';
import { TemplateEnvelope, TemplatePageResponse, templateResponse } from './template.responses.js';

@ApiTags('Plantillas')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('templates')
export class TemplatesController {
  constructor(
    @Inject(CreateTemplate) private readonly createTemplate: CreateTemplate,
    @Inject(GetTemplate) private readonly getTemplate: GetTemplate,
    @Inject(ListTemplates) private readonly listTemplates: ListTemplates,
  ) {}
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
