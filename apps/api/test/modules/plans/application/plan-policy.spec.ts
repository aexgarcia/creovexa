import type { TransactionContext } from '#app/application/ports/transaction-context';
import { PlanPolicy } from '#app/modules/plans/application/plan-policy';
import type {
  PlanAssignment,
  PlanStore,
  UsageCounter,
} from '#app/modules/plans/application/ports/plan-store';
import {
  AiQuotaExceededError,
  ImageQualityNotAllowedError,
  PlanLimitReachedError,
  PlanRequiredError,
} from '#app/modules/plans/domain/errors/plan.errors';
import { AiUsageKind, PlanCode, PlanResource } from '#app/modules/plans/domain/plan-catalog';

const ORG = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-11-22T15:00:00Z');

// Store en memoria con transacciones: lo sumado se descarta si el trabajo falla.
class PlanStoreFake implements PlanStore {
  counts = new Map<string, number>();
  active: Record<PlanResource, number> = { PRODUCT: 0, TEMPLATE: 0 };
  plan: PlanCode | null = PlanCode.EMPRENDE;
  private pending: Map<string, number> | null = null;

  private key(counter: UsageCounter) {
    return [counter.kind, counter.scope, counter.periodStart.toISOString()].join('|');
  }
  run<T>(work: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    this.pending = new Map(this.counts);
    return work({} as TransactionContext).then(
      (value) => {
        this.counts = this.pending!;
        this.pending = null;
        return value;
      },
      (error: unknown) => {
        this.pending = null;
        throw error;
      },
    );
  }
  private current() {
    return this.pending ?? this.counts;
  }
  assignment(): Promise<PlanAssignment | null> {
    return Promise.resolve(
      this.plan && {
        organizationId: ORG,
        plan: this.plan,
        periodAnchor: new Date('2026-11-01T00:00:00Z'),
        timeZone: 'America/Lima',
      },
    );
  }
  increment(counter: UsageCounter, units: number, limit: number) {
    const used = this.current().get(this.key(counter)) ?? 0;
    if (used + units > limit) return Promise.resolve(false);
    this.current().set(this.key(counter), used + units);
    return Promise.resolve(true);
  }
  used(counter: UsageCounter) {
    return Promise.resolve(this.current().get(this.key(counter)) ?? 0);
  }
  refund() {
    return Promise.resolve();
  }
  activeCount(_organizationId: string, resource: PlanResource) {
    return Promise.resolve(this.active[resource]);
  }
  timeZone() {
    return Promise.resolve('America/Lima');
  }
  assign() {
    return Promise.resolve();
  }
}

function setup(plan: PlanCode | null = PlanCode.EMPRENDE) {
  const store = new PlanStoreFake();
  store.plan = plan;
  const policy = new PlanPolicy(store, store, { now: () => NOW });
  return { store, policy };
}

describe('PlanPolicy', () => {
  it('counts the month and the day of each flyer', async () => {
    const { policy } = setup();
    await policy.consume(ORG, AiUsageKind.IMAGE);
    const { usage } = await policy.usage(ORG);
    expect(usage.IMAGE.month).toMatchObject({ used: 1, limit: 60 });
    expect(usage.IMAGE.day).toMatchObject({ used: 1, limit: 10 });
    expect(usage.COPY.day).toBeNull();
  });

  it('rejects at the daily cap without counting the month', async () => {
    const { policy } = setup();
    for (let i = 0; i < 10; i++) await policy.consume(ORG, AiUsageKind.IMAGE);
    const error = await policy.consume(ORG, AiUsageKind.IMAGE).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(AiQuotaExceededError);
    expect(error).toMatchObject({ scope: 'DAY', limit: 10, used: 10 });
    expect((error as AiQuotaExceededError).resetsAt.toISOString()).toBe('2026-11-23T05:00:00.000Z');
    expect((await policy.usage(ORG)).usage.IMAGE.month.used).toBe(10);
  });

  it('charges three flyers for medium quality, only in plans that include it', async () => {
    await expect(
      setup().policy.consume(ORG, AiUsageKind.IMAGE, { quality: 'MEDIUM' }),
    ).rejects.toBeInstanceOf(ImageQualityNotAllowedError);
    const { policy } = setup(PlanCode.NEGOCIO);
    await policy.consume(ORG, AiUsageKind.IMAGE, { quality: 'MEDIUM' });
    expect((await policy.usage(ORG)).usage.IMAGE.month.used).toBe(3);
  });

  it('applies the monthly limit of copies', async () => {
    const { policy } = setup();
    for (let i = 0; i < 120; i++) await policy.consume(ORG, AiUsageKind.COPY);
    await expect(policy.consume(ORG, AiUsageKind.COPY)).rejects.toMatchObject({
      scope: 'MONTH',
      limit: 120,
    });
  });

  it('requires a plan', async () => {
    const { policy } = setup(null);
    await expect(policy.consume(ORG, AiUsageKind.COPY)).rejects.toBeInstanceOf(PlanRequiredError);
    await expect(policy.assertCanCreate(ORG, PlanResource.PRODUCT)).rejects.toBeInstanceOf(
      PlanRequiredError,
    );
  });

  it('limits active products and templates, except in unlimited plans', async () => {
    const { store, policy } = setup();
    store.active.PRODUCT = 49;
    await policy.assertCanCreate(ORG, PlanResource.PRODUCT);
    store.active.PRODUCT = 50;
    await expect(policy.assertCanCreate(ORG, PlanResource.PRODUCT)).rejects.toBeInstanceOf(
      PlanLimitReachedError,
    );
    const agency = setup(PlanCode.AGENCIA);
    agency.store.active.TEMPLATE = 10_000;
    await agency.policy.assertCanCreate(ORG, PlanResource.TEMPLATE);
  });
});
