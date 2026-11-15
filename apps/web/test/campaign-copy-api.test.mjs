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
const { campaignCopyService } =
  await import('../src/features/campaigns/services/campaign-copy.service.ts');
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test('copy query preserves missing content and encodes campaign identifiers', async () => {
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/campaigns/a%2Fb/copy'));
    return Response.json({ data: null });
  };
  assert.equal(await campaignCopyService.get('a/b'), null);
});
test('copy mutation sends one request and never retries provider failures', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/copy'));
    assert.equal(options.method, 'POST');
    assert.ok(options.signal);
    return Response.json({ error: 'private provider error' }, { status: 503 });
  };
  await assert.rejects(
    campaignCopyService.generate('id'),
    (error) => error.status === 503 && !error.message.includes('private'),
  );
  assert.equal(calls, 1);
});
test('requesting copy returns the pending job without waiting for the provider', async () => {
  const data = { generationId: 'generation', status: 'PENDING', failureCode: null, copy: null };
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, 'POST');
    return Response.json({ data }, { status: 202 });
  };
  assert.deepEqual(await campaignCopyService.generate('campaign'), data);
});
test('copy status preserves the generation identity, the failure and the flyer texts', async () => {
  for (const data of [
    {
      generationId: 'generation',
      status: 'READY',
      failureCode: null,
      copy: {
        headline: 'Producto',
        subheadline: 'Hecho para ti',
        caption: 'S/ 10.00',
        cta: 'Comprar',
        hashtags: [],
      },
    },
    { generationId: 'generation', status: 'FAILED', failureCode: 'TIMEOUT', copy: null },
  ]) {
    globalThis.fetch = async () => Response.json({ data });
    assert.deepEqual(await campaignCopyService.get('campaign'), data);
  }
});
test('correcting flyer texts sends one PATCH with the generation it applies to', async () => {
  const input = { generationId: 'generation', headline: 'Tu café', subheadline: null };
  const data = { generationId: 'generation', status: 'READY', failureCode: null, copy: null };
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/campaigns/a%2Fb/copy'));
    assert.equal(options.method, 'PATCH');
    assert.deepEqual(JSON.parse(options.body), input);
    return Response.json({ data });
  };
  assert.deepEqual(await campaignCopyService.updateFlyerTexts('a/b', input), data);
  assert.equal(calls, 1);
});
