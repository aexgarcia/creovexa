import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { AiUsageKind, PlanCode, PlanResource } from '../../domain/plan-catalog.js';

export const PLAN_STORE = Symbol('PLAN_STORE');

export interface PlanAssignment {
  organizationId: string;
  plan: PlanCode;
  // Fecha local en que empezó el plan: fija el día de reinicio mensual.
  periodAnchor: Date;
  // Zona horaria de la organización, para contar días y meses locales.
  timeZone: string;
}

export interface UsageCounter {
  organizationId: string;
  kind: AiUsageKind;
  scope: 'MONTH' | 'DAY';
  periodStart: Date;
}

// Persistencia del plan asignado y de los contadores de uso.
export interface PlanStore {
  /** null si la organización no existe o no tiene plan. */
  assignment(organizationId: string): Promise<PlanAssignment | null>;
  /** Suma unidades solo si el total no pasa el límite; false si lo pasaría. Atómico. */
  increment(
    counter: UsageCounter,
    units: number,
    limit: number,
    transaction?: TransactionContext,
  ): Promise<boolean>;
  used(counter: UsageCounter, transaction?: TransactionContext): Promise<number>;
  /** Resta unidades sin bajar de cero (devolución administrativa). */
  refund(counter: UsageCounter, units: number): Promise<void>;
  /** Productos o plantillas activos (no archivados) de la organización. */
  activeCount(organizationId: string, resource: PlanResource): Promise<number>;
  /** null si la organización no existe. */
  timeZone(organizationId: string): Promise<string | null>;
  /** Crea o cambia el plan. Al crearlo, el inicio del período es la fecha local indicada. */
  assign(organizationId: string, plan: PlanCode, periodAnchor: Date, at: Date): Promise<void>;
}
