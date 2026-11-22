import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '#app/presentation/http/api-errors.decorator';
import {
  DevelopmentOrganizationGuard,
  OrganizationId,
} from '#app/presentation/http/request-context';
import { PlanPolicy } from '../application/plan-policy.js';
import { AiUsageKind, PlanCode, PlanResource } from '../domain/plan-catalog.js';

class UsageWindowResponse {
  @ApiProperty({ type: Number }) used!: number;
  @ApiProperty({ type: Number }) limit!: number;
  @ApiProperty({ type: String, format: 'date-time' }) resetsAt!: string;
}
class KindUsageResponse {
  @ApiProperty({ type: UsageWindowResponse }) month!: UsageWindowResponse;
  @ApiProperty({ type: UsageWindowResponse, nullable: true }) day!: UsageWindowResponse | null;
}
class ResourceUsageResponse {
  @ApiProperty({ type: Number }) used!: number;
  @ApiProperty({ type: Number, nullable: true, description: 'null: sin límite.' })
  limit!: number | null;
}
class PlanResponse {
  @ApiProperty({ enum: PlanCode, enumName: 'PlanCode' }) code!: PlanCode;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: Number, description: 'Referencia en soles, con IGV.' })
  monthlyPrice!: number;
  @ApiProperty({ type: Number }) yearlyPrice!: number;
  @ApiProperty({ type: [String], example: ['LOW', 'MEDIUM'] }) imageQualities!: string[];
  @ApiProperty({ type: Number }) brands!: number;
  @ApiProperty({ type: Number }) users!: number;
}
class PlanUsageResponse {
  @ApiProperty({ type: PlanResponse }) plan!: PlanResponse;
  @ApiProperty({ type: String, format: 'date', description: 'Inicio del mes de uso en curso.' })
  periodStart!: string;
  @ApiProperty({ type: String, format: 'date-time' }) periodResetsAt!: string;
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/KindUsageResponse' },
    description: 'Por tipo: IMAGE, COPY y PRODUCT_SUGGESTION.',
  })
  usage!: Record<AiUsageKind, KindUsageResponse>;
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/ResourceUsageResponse' },
    description: 'Por recurso: PRODUCT y TEMPLATE.',
  })
  resources!: Record<PlanResource, ResourceUsageResponse>;
}
class PlanUsageEnvelope {
  @ApiProperty({ type: PlanUsageResponse }) data!: PlanUsageResponse;
}

@ApiTags('Plan')
@ApiExtraModels(KindUsageResponse, ResourceUsageResponse)
@ApiErrors()
@UseGuards(DevelopmentOrganizationGuard)
@Controller('plan')
export class PlansController {
  constructor(@Inject(PlanPolicy) private readonly policy: PlanPolicy) {}

  @Get()
  @ApiOperation({ summary: 'Plan de la organización y su uso en el período vigente (ADR-0033)' })
  @ApiOkResponse({ type: PlanUsageEnvelope })
  async get(@OrganizationId() organizationId: string): Promise<PlanUsageEnvelope> {
    const { plan, period, usage, resources } = await this.policy.usage(organizationId);
    const window = (value: { used: number; limit: number; resetsAt: Date }) => ({
      ...value,
      resetsAt: value.resetsAt.toISOString(),
    });
    return {
      data: {
        plan: {
          code: plan.code,
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          imageQualities: [...plan.imageQualities],
          brands: plan.brands,
          users: plan.users,
        },
        periodStart: period.start.toISOString().slice(0, 10),
        periodResetsAt: period.resetsAt.toISOString(),
        usage: Object.fromEntries(
          Object.entries(usage).map(([kind, value]) => [
            kind,
            { month: window(value.month), day: value.day && window(value.day) },
          ]),
        ) as Record<AiUsageKind, KindUsageResponse>,
        resources,
      },
    };
  }
}
