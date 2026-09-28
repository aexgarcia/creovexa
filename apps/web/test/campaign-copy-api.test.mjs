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
test('copy preserves the persisted generation identity and image prompt', async () => {
  const data = {
    generationId: 'generation',
    headline: 'Producto',
    caption: 'PEN 10.00',
    cta: 'Comprar',
    hashtags: [],
    imagePrompt: 'Fondo neutro',
  };
  globalThis.fetch = async () => Response.json({ data });
  assert.deepEqual(await campaignCopyService.generate('campaign'), data);
});
