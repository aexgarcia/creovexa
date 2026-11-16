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

test('uploads exactly one logo as multipart and resolves its private read URL', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'brand.png', { type: 'image/png' });
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/organization/logo'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.has('Content-Type'), false);
    assert.deepEqual([...options.body.keys()], ['logo']);
    assert.equal(options.body.get('logo').name, 'brand.png');
    assert.deepEqual(
      new Uint8Array(await options.body.get('logo').arrayBuffer()),
      new Uint8Array([1, 2, 3]),
    );
    return Response.json({
      data: { id: 'organization-1', logoAssetId: 'logo-1', logoUrl: '/organization/logos/logo-1' },
    });
  };
  const result = await companySettingsService.uploadLogo(file);
  assert.ok(result.logoUrl.endsWith('/organization/logos/logo-1'));
  assert.ok(result.logoUrl.startsWith('http'));
});

test('does not expose provider errors or retry a failed logo upload', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json(
      { error: { code: 'ORGANIZATION_LOGO_UNAVAILABLE', message: 'secret provider details' } },
      { status: 503 },
    );
  };
  await assert.rejects(
    companySettingsService.uploadLogo(new File(['x'], 'logo.png')),
    (error) => error.status === 503 && !error.message.includes('secret'),
  );
  assert.equal(calls, 1);
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
test('sends the brand kit and null to go back to the logo colors', async () => {
  const region = {
    country: 'MX',
    locale: 'es-MX',
    timeZone: 'America/Mexico_City',
    currency: 'USD',
  };
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return Response.json({ data: { id: 'organization-1' } });
  };
  await companySettingsService.update({ industry: 'Cafetería', region, brandColors: null });
  assert.deepEqual(bodies[0], { industry: 'Cafetería', region, brandColors: null });
});
test('uploads and removes a logo variant and resolves its read URL', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method });
    return Response.json({
      data: { id: 'organization-1', iconAssetId: 'icon-1', iconUrl: '/organization/logos/icon-1' },
    });
  };
  const saved = await companySettingsService.uploadLogoVariant('icon', new File(['x'], 'i.png'));
  assert.ok(saved.iconUrl.startsWith('http'));
  await companySettingsService.removeLogoVariant('dark-background');
  assert.ok(calls[0].url.endsWith('/organization/logo/icon'));
  assert.equal(calls[0].method, 'POST');
  assert.ok(calls[1].url.endsWith('/organization/logo/dark-background'));
  assert.equal(calls[1].method, 'DELETE');
});
test('sends the copy voice of the brand (ADR-0029)', async () => {
  const voice = {
    audience: 'Oficinistas de Lima',
    valueProps: ['Delivery en Lima'],
    emojiStyle: 'EXPRESSIVE',
    addressForm: 'USTED',
    copyExamples: ['Su café de cada mañana.\nListo en minutos.'],
  };
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return Response.json({ data: { id: 'organization-1', ...voice } });
  };
  const saved = await companySettingsService.update(voice);
  assert.deepEqual(bodies[0], voice);
  assert.equal(saved.emojiStyle, 'EXPRESSIVE');
});
