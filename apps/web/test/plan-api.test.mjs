import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier === '@/lib/api-client'
        ? new URL('../src/lib/api-client.ts', import.meta.url).href
        : specifier,
      context,
    );
  },
});
const { planService } = await import('../src/features/plan/services/plan.service.ts');
const { remaining, nextReset, imageUnits } =
  await import('../src/features/plan/types/plan.types.ts');
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const window = (used, limit, resetsAt) => ({ used, limit, resetsAt });
const plan = {
  plan: { code: 'EMPRENDE', imageQualities: ['LOW'] },
  usage: {
    IMAGE: {
      month: window(55, 60, '2026-12-15T05:00:00.000Z'),
      day: window(2, 10, '2026-11-23T05:00:00.000Z'),
    },
    COPY: { month: window(120, 120, '2026-12-15T05:00:00.000Z'), day: null },
    PRODUCT_SUGGESTION: { month: window(10, 50, '2026-12-15T05:00:00.000Z'), day: null },
  },
};

test('lee el plan de la organización sin enviar datos propios', async () => {
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).endsWith('/plan'));
    assert.equal(options.method ?? 'GET', 'GET');
    return Response.json({ data: plan });
  };
  assert.deepEqual(await planService.get(), plan);
});

test('lo que queda hoy es el menor entre el mes y el día (ADR-0033)', () => {
  // Quedan 5 en el mes y 8 hoy: manda el mes.
  assert.equal(remaining(plan, 'IMAGE'), 5);
  assert.equal(remaining(plan, 'PRODUCT_SUGGESTION'), 40);
  assert.equal(remaining(plan, 'COPY'), 0);
  // Con el mes agotado, el cupo vuelve al reiniciarse el mes, no mañana.
  assert.equal(nextReset(plan, 'COPY'), '2026-12-15T05:00:00.000Z');
  assert.equal(nextReset(plan, 'IMAGE'), '2026-11-23T05:00:00.000Z');
  assert.equal(imageUnits('MEDIUM'), 3);
});
