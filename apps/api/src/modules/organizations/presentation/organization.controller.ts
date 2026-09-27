import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import { validateRequest } from '#app/presentation/http/request-validation';
import { GetOrganization } from '../application/use-cases/get-organization.js';
import { UpdateOrganizationProfile } from '../application/use-cases/update-organization-profile.js';
import { UpdateOrganizationRequest } from './organization.requests.js';
import { OrganizationEnvelope } from './organization.responses.js';
@ApiTags('Organización')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('organization')
export class OrganizationController {
  constructor(
    @Inject(GetOrganization) private readonly getOrganization: GetOrganization,
    @Inject(UpdateOrganizationProfile)
    private readonly updateOrganization: UpdateOrganizationProfile,
  ) {}
  @Get()
  @ApiOkResponse({ type: OrganizationEnvelope })
  async get(@OrganizationId() organizationId: string): Promise<OrganizationEnvelope> {
    return { data: { ...(await this.getOrganization.execute({ organizationId })) } };
  }
  @Patch()
  @ApiBody({ type: UpdateOrganizationRequest })
  @ApiOkResponse({ type: OrganizationEnvelope })
  async update(
    @OrganizationId() organizationId: string,
    @Body(validateRequest(UpdateOrganizationRequest)) body: UpdateOrganizationRequest,
  ): Promise<OrganizationEnvelope> {
    if (Object.values(body).every((value) => value === undefined)) throw new BadRequestException();
    return { data: { ...(await this.updateOrganization.execute({ ...body, organizationId })) } };
  }
}
