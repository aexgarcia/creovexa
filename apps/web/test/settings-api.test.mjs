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
const { companySettingsService } =
  await import('../src/features/settings/services/company-settings.service.ts');
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('loads persisted organization settings without demo fallback', async () => {
  const settings = {
    id: 'organization-1',
    name: 'Company',
    brandTone: null,
    logoAssetId: 'asset-1',
  };
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/organization'));
    return Response.json({ data: settings });
  };
  assert.deepEqual(await companySettingsService.get(), settings);
  globalThis.fetch = async () => Response.json({ error: 'missing' }, { status: 404 });
  await assert.rejects(companySettingsService.get(), (error) => error.status === 404);
});
test('updates editable profile fields without sending organization selection or logo', async () => {
  const fields = { name: 'Updated', description: '', brandTone: null };
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/organization'));
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), fields);
    return Response.json({ data: { id: 'organization-1', ...fields } });
  };
  assert.equal(
    (
      await companySettingsService.update({
        ...fields,
        organizationId: 'other',
        logoAssetId: null,
        primaryColor: '#ffffff',
      })
    ).id,
    'organization-1',
  );
  assert.equal(calls, 1);
});
