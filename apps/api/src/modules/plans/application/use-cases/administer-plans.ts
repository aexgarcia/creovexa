import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import { dailyPeriod, dateValue, localDate, monthlyPeriod } from '../../domain/billing-period.js';
import { AiUsageKind, PlanCode } from '../../domain/plan-catalog.js';
import type { PlanStore } from '../ports/plan-store.js';

export class PlanOrganizationNotFoundError extends Error {
  constructor() {
    super('La organización no existe.');
    this.name = 'PlanOrganizationNotFoundError';
  }
}

export class InvalidPlanCommandError extends Error {
  constructor(field: string) {
    super(`El valor de ${field} no es válido.`);
    this.name = 'InvalidPlanCommandError';
  }
}

// Operaciones del propietario del despliegue, sin endpoint HTTP (ADR-0033): asignar el plan y
// devolver unidades consumidas por un fallo del sistema.
export class AdministerPlans {
  constructor(
    private readonly store: PlanStore,
    private readonly clock: Clock,
  ) {}

  /** Asigna o cambia el plan. Un cambio conserva el período en curso. */
  async assign(organizationId: string, plan: string): Promise<void> {
    const id = entityId(organizationId, 'organizationId');
    if (!Object.values(PlanCode).includes(plan as PlanCode))
      throw new InvalidPlanCommandError('plan');
    const timeZone = await this.store.timeZone(id);
    if (!timeZone) throw new PlanOrganizationNotFoundError();
    const now = this.clock.now();
    await this.store.assign(id, plan as PlanCode, dateValue(localDate(now, timeZone)), now);
  }

  /** Devuelve unidades al mes en curso y, para los flyers, al día en curso. */
  async refund(organizationId: string, kind: string, units: number): Promise<void> {
    const id = entityId(organizationId, 'organizationId');
    if (!Object.values(AiUsageKind).includes(kind as AiUsageKind))
      throw new InvalidPlanCommandError('kind');
    if (!Number.isInteger(units) || units < 1) throw new InvalidPlanCommandError('units');
    const assignment = await this.store.assignment(id);
    if (!assignment) throw new PlanOrganizationNotFoundError();
    const now = this.clock.now();
    const month = monthlyPeriod(
      localDate(assignment.periodAnchor, 'UTC'),
      now,
      assignment.timeZone,
    );
    const counter = { organizationId: id, kind: kind as AiUsageKind };
    await this.store.refund({ ...counter, scope: 'MONTH', periodStart: month.start }, units);
    if (kind === AiUsageKind.IMAGE)
      await this.store.refund(
        { ...counter, scope: 'DAY', periodStart: dailyPeriod(now, assignment.timeZone).start },
        units,
      );
  }
}
