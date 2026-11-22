// Contrato publicado del módulo `plans` (ADR-0033, ADR-0021). Los demás módulos usan solo esto.
import type { ConsumeOptions } from './application/plan-policy.js';
import type { AiUsageKind, PlanResource } from './domain/plan-catalog.js';

export { AiUsageKind, PlanResource, type ImageQuality } from './domain/plan-catalog.js';
export {
  AiQuotaExceededError,
  ImageQualityNotAllowedError,
  PlanLimitReachedError,
  PlanRequiredError,
} from './domain/errors/plan.errors.js';
export type { ConsumeOptions };

export const AI_QUOTA = Symbol('AI_QUOTA');
export const PLAN_LIMITS = Symbol('PLAN_LIMITS');

/** Cupo de IA del plan. Llamar dentro de la transacción que encola el trabajo, si la hay. */
export interface AiQuota {
  consume(organizationId: string, kind: AiUsageKind, options?: ConsumeOptions): Promise<void>;
}

/** Máximo de recursos activos del plan. */
export interface PlanLimits {
  assertCanCreate(organizationId: string, resource: PlanResource): Promise<void>;
}
