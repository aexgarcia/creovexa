import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { amountMinor, decimalPrice } from '../src/features/products/schemas/product-price.ts';
import { apiRequest, ApiError } from '../src/lib/api-client.ts';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('converts decimal amounts exactly, including comma and the safe integer limit', () => {
  for (const [input, expected] of [
    ['0', 0],
    ['0.29', 29],
    ['19,90', 1990],
    ['90071992547409.91', Number.MAX_SAFE_INTEGER],
  ]) {
    assert.equal(amountMinor(input), expected);
    assert.equal(amountMinor(decimalPrice(expected)), expected);
  }
});
test('rejects negative, empty, excess precision, exponential and unsafe amounts', () => {
  for (const input of ['', '-1', '1.001', '1e3', 'Infinity', '90071992547409.92', '1,000.00'])
    assert.equal(amountMinor(input), null);
});
test('sends a JSON mutation once and preserves the API response', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/products'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(JSON.parse(options.body).regularPrice.amountMinor, 29);
    return Response.json({ data: { id: 'persisted' } }, { status: 201 });
  };
  assert.deepEqual(
    await apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify({ regularPrice: { amountMinor: 29, currency: 'PEN' } }),
    }),
    { data: { id: 'persisted' } },
  );
  assert.equal(calls, 1);
});
test('reports HTTP failure without exposing the raw server message', async () => {
  globalThis.fetch = async () =>
    Response.json(
      { error: { message: 'private database error' } },
      { status: 503, headers: { 'x-request-id': 'trace-1' } },
    );
  await assert.rejects(
    apiRequest('/products'),
    (error) =>
      error instanceof ApiError &&
      error.status === 503 &&
      error.requestId === 'trace-1' &&
      !error.message.includes('database'),
  );
});
test('does not return success for invalid JSON or unavailable network', async () => {
  globalThis.fetch = async () => new Response('<html>error</html>', { status: 200 });
  await assert.rejects(apiRequest('/products'), ApiError);
  globalThis.fetch = async () => {
    throw new TypeError('network');
  };
  await assert.rejects(apiRequest('/products'), (error) => error.status === 0);
});
test('preserves query cancellation instead of presenting it as a network failure', async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_url, options) => {
    throw options.signal.reason;
  };
  await assert.rejects(apiRequest('/products', { signal: controller.signal }), {
    name: 'AbortError',
  });
});
