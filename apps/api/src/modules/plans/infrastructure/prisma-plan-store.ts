import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { prismaTransaction } from '#app/infrastructure/persistence/prisma/transaction-context';
import { PlanCode, PlanResource } from '../domain/plan-catalog.js';
import type { PlanStore, UsageCounter } from '../application/ports/plan-store.js';

const key = (counter: UsageCounter) => ({
  organizationId: counter.organizationId,
  kind: counter.kind,
  scope: counter.scope,
  periodStart: counter.periodStart,
});

export class PrismaPlanStore implements PlanStore {
  constructor(private readonly client: PrismaClient) {}

  private db(transaction?: TransactionContext) {
    return transaction ? prismaTransaction(transaction) : this.client;
  }

  async assignment(organizationId: string) {
    const row = await this.client.organizationPlan.findUnique({
      where: { organizationId },
      select: { plan: true, periodAnchor: true, organization: { select: { timeZone: true } } },
    });
    if (!row) return null;
    return {
      organizationId,
      plan: PlanCode[row.plan],
      periodAnchor: row.periodAnchor,
      timeZone: row.organization.timeZone,
    };
  }

  // Asegura la fila y suma solo si no pasa el límite. La condición de updateMany se vuelve a
  // evaluar con la fila bloqueada, así que dos pedidos simultáneos no pasan el límite.
  async increment(
    counter: UsageCounter,
    units: number,
    limit: number,
    transaction?: TransactionContext,
  ): Promise<boolean> {
    const db = this.db(transaction);
    await db.aiUsage.createMany({ data: [{ ...key(counter), used: 0 }], skipDuplicates: true });
    const result = await db.aiUsage.updateMany({
      where: { ...key(counter), used: { lte: limit - units } },
      data: { used: { increment: units } },
    });
    return result.count === 1;
  }

  async used(counter: UsageCounter, transaction?: TransactionContext): Promise<number> {
    const row = await this.db(transaction).aiUsage.findUnique({
      where: { organizationId_kind_scope_periodStart: key(counter) },
      select: { used: true },
    });
    return row?.used ?? 0;
  }

  async refund(counter: UsageCounter, units: number): Promise<void> {
    await this.client.$transaction(async (tx) => {
      const row = await tx.aiUsage.findUnique({
        where: { organizationId_kind_scope_periodStart: key(counter) },
        select: { used: true },
      });
      if (!row) return;
      await tx.aiUsage.update({
        where: { organizationId_kind_scope_periodStart: key(counter) },
        data: { used: Math.max(0, row.used - units) },
      });
    });
  }

  async activeCount(organizationId: string, resource: PlanResource): Promise<number> {
    const where = { organizationId, archivedAt: null };
    return resource === PlanResource.PRODUCT
      ? this.client.product.count({ where })
      : this.client.template.count({ where });
  }

  async timeZone(organizationId: string): Promise<string | null> {
    const row = await this.client.organization.findUnique({
      where: { id: organizationId },
      select: { timeZone: true },
    });
    return row?.timeZone ?? null;
  }

  async assign(organizationId: string, plan: PlanCode, periodAnchor: Date, at: Date) {
    await this.client.organizationPlan.upsert({
      where: { organizationId },
      create: { organizationId, plan, periodAnchor, assignedAt: at },
      // Un cambio de plan conserva el período en curso.
      update: { plan, assignedAt: at },
    });
  }
}
