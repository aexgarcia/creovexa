import { DashboardEnvelope } from './dashboard.responses.js';
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { GetDashboard } from '../application/get-dashboard.js';
@ApiTags('Dashboard')
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(GetDashboard) private readonly getDashboard: GetDashboard) {}
  @Get()
  @ApiOkResponse({
    type: DashboardEnvelope,
    description:
      'Totales de la organización, campañas por estado, publicaciones por plataforma y cinco campañas recientes.',
  })
  async get(@OrganizationId() organizationId: string) {
    return { data: await this.getDashboard.execute({ organizationId }) };
  }
}
