import type { Clock } from '#app/application/ports/clock';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';
import {
  dailyPeriod,
  localDate,
  monthlyPeriod,
  type UsagePeriod,
} from '../domain/billing-period.js';
import {
  AiQuotaExceededError,
  ImageQualityNotAllowedError,
  PlanLimitReachedError,
  PlanRequiredError,
} from '../domain/errors/plan.errors.js';
import {
  AiUsageKind,
  PLANS,
  PlanResource,
  imageUnits,
  type ImageQuality,
} from '../domain/plan-catalog.js';
import type { PlanAssignment, PlanStore } from './ports/plan-store.js';

export interface ConsumeOptions {
  // Calidad del flyer; solo para IMAGE. Por defecto, LOW.
  quality?: ImageQuality;
  // La transacción del llamador: si se revierte, el consumo también.
  transaction?: TransactionContext;
}

export interface KindUsage {
  month: { used: number; limit: number; resetsAt: Date };
  day: { used: number; limit: number; resetsAt: Date } | null;
}

// Aplica el plan de la organización: cupos de IA y máximos de recursos (ADR-0033).
export class PlanPolicy {
  constructor(
    private readonly store: PlanStore,
    private readonly transactions: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  /** Descuenta del cupo mensual y, si lo hay, del diario. Rechaza sin consumir si no alcanza. */
  async consume(organizationId: string, kind: AiUsageKind, options: ConsumeOptions = {}) {
    const assignment = await this.requireAssignment(organizationId);
    const plan = PLANS[assignment.plan];
    const quality = options.quality ?? 'LOW';
    if (kind === AiUsageKind.IMAGE && !plan.imageQualities.includes(quality))
      throw new ImageQualityNotAllowedError(quality);
    const units = kind === AiUsageKind.IMAGE ? imageUnits(quality) : 1;
    const periods = this.periods(assignment);
    const work = async (transaction: TransactionContext) => {
      const scopes = [
        { scope: 'MONTH' as const, limit: plan.monthly[kind], period: periods.month },
        ...(plan.daily[kind] === undefined
          ? []
          : [{ scope: 'DAY' as const, limit: plan.daily[kind], period: periods.day }]),
      ];
      for (const { scope, limit, period } of scopes) {
        const counter = { organizationId, kind, scope, periodStart: period.start };
        if (units > limit || !(await this.store.increment(counter, units, limit, transaction))) {
          const used = await this.store.used(counter, transaction);
          // Lanzar revierte la transacción: lo sumado en otro alcance no queda contado.
          throw new AiQuotaExceededError(kind, scope, limit, used, period.resetsAt);
        }
      }
    };
    if (options.transaction) await work(options.transaction);
    else await this.transactions.run(work);
  }

  /** Falla si crear o restaurar un recurso más pasaría el máximo del plan. */
  async assertCanCreate(organizationId: string, resource: PlanResource): Promise<void> {
    const assignment = await this.requireAssignment(organizationId);
    const limit = PLANS[assignment.plan].resources[resource];
    if (limit === null) return;
    if ((await this.store.activeCount(organizationId, resource)) >= limit)
      throw new PlanLimitReachedError(resource, limit);
  }

  /** Lo usado y el límite de cada tipo en los períodos vigentes. */
  async usage(organizationId: string) {
    const assignment = await this.requireAssignment(organizationId);
    const plan = PLANS[assignment.plan];
    const periods = this.periods(assignment);
    const usage = {} as Record<AiUsageKind, KindUsage>;
    for (const kind of Object.values(AiUsageKind)) {
      const counter = (scope: 'MONTH' | 'DAY', period: UsagePeriod) => ({
        organizationId,
        kind,
        scope,
        periodStart: period.start,
      });
      const daily = plan.daily[kind];
      usage[kind] = {
        month: {
          used: await this.store.used(counter('MONTH', periods.month)),
          limit: plan.monthly[kind],
          resetsAt: periods.month.resetsAt,
        },
        day:
          daily === undefined
            ? null
            : {
                used: await this.store.used(counter('DAY', periods.day)),
                limit: daily,
                resetsAt: periods.day.resetsAt,
              },
      };
    }
    const resources = {} as Record<PlanResource, { used: number; limit: number | null }>;
    for (const resource of Object.values(PlanResource))
      resources[resource] = {
        used: await this.store.activeCount(organizationId, resource),
        limit: plan.resources[resource],
      };
    return { assignment, plan, period: periods.month, usage, resources };
  }

  async requireAssignment(organizationId: string): Promise<PlanAssignment> {
    const assignment = await this.store.assignment(organizationId);
    if (!assignment) throw new PlanRequiredError();
    return assignment;
  }

  private periods(assignment: PlanAssignment) {
    const now = this.clock.now();
    return {
      month: monthlyPeriod(localDate(assignment.periodAnchor, 'UTC'), now, assignment.timeZone),
      day: dailyPeriod(now, assignment.timeZone),
    };
  }
}
