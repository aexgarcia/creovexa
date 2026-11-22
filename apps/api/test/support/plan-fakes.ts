import { AiQuotaExceededError, PlanLimitReachedError } from '#app/modules/plans/contract';
import type {
  AiQuota,
  AiUsageKind,
  ConsumeOptions,
  PlanLimits,
  PlanResource,
} from '#app/modules/plans/contract';

// Cupo y límites del plan para tests de otros módulos (ADR-0033). Sin límite por defecto.
export class PlanFake implements AiQuota, PlanLimits {
  readonly consumed: { organizationId: string; kind: AiUsageKind; options?: ConsumeOptions }[] = [];
  exhausted = false;
  resourceLimitReached = false;

  consume(organizationId: string, kind: AiUsageKind, options?: ConsumeOptions): Promise<void> {
    if (this.exhausted)
      return Promise.reject(new AiQuotaExceededError(kind, 'MONTH', 1, 1, new Date(0)));
    this.consumed.push({ organizationId, kind, options });
    return Promise.resolve();
  }

  assertCanCreate(_organizationId: string, resource: PlanResource): Promise<void> {
    return this.resourceLimitReached
      ? Promise.reject(new PlanLimitReachedError(resource, 1))
      : Promise.resolve();
  }
}
