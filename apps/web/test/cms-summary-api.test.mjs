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
const { dashboardService } =
  await import('../src/features/dashboard/services/dashboard.service.ts');
const { publicationService } =
  await import('../src/features/publications/services/publication.service.ts');
const { templateService } = await import('../src/features/templates/services/template.service.ts');
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('dashboard preserves zero totals and returns network errors without demo data', async () => {
  const data = {
    totals: { products: 0, campaigns: 0, published: 0, templates: 0, pendingApproval: 0 },
    recentCampaigns: [],
    campaignsByStatus: [],
    publicationsByPlatform: [],
  };
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/dashboard'));
    return Response.json({ data });
  };
  assert.deepEqual(await dashboardService.getDashboard(), data);
  globalThis.fetch = async () => {
    throw new TypeError('offline');
  };
  await assert.rejects(dashboardService.getDashboard(), (error) => error.status === 0);
});
test('publication history preserves pagination and pending attempt results', async () => {
  const response = {
    data: [{ id: 'attempt-1', number: 2, result: null }],
    meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
  };
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/publications/pub%2F1/attempts?page=2&limit=20'));
    return Response.json(response);
  };
  assert.deepEqual(await publicationService.attempts('pub/1', 2), response);
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/publications?page=3&limit=20'));
    return Response.json({ data: [], meta: { page: 3, total: 0 } });
  };
  assert.equal((await publicationService.findAll(3)).data.length, 0);
});
test('template update sends the reviewed revision and does not retry a conflict', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/templates/template-1'));
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), {
      name: 'Updated',
      expectedRevisionId: 'revision-1',
    });
    return Response.json({ error: 'conflict' }, { status: 409 });
  };
  await assert.rejects(
    templateService.update('template-1', { name: 'Updated', expectedRevisionId: 'revision-1' }),
    (error) => error.status === 409,
  );
  assert.equal(calls, 1);
});
