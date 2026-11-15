import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { amountMinor, decimalPrice } from '../src/features/products/schemas/product-price.ts';
import { apiRequest, ApiError } from '../src/lib/api-client.ts';

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
const { productService } = await import('../src/features/products/services/product.service.ts');

const originalFetch = globalThis.fetch;

test('filtra el catálogo por disponibilidad y usa activos por defecto para campañas', async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ data: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } });
  };
  await productService.findAll(2);
  await productService.findAll(1, undefined, 'archived');
  await productService.findAll(1, undefined, 'all');
  assert.ok(urls[0].endsWith('/products?page=2&limit=20&status=active'));
  assert.ok(urls[1].endsWith('&status=archived'));
  assert.ok(urls[2].endsWith('&status=all'));
});

test('archiva y restaura por ID codificado, conserva la imagen y propaga el fallo', async () => {
  const states = [];
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).endsWith('/products/id%2Fespecial/archive'));
    assert.equal(options.method, 'PATCH');
    const { archived } = JSON.parse(options.body);
    states.push(archived);
    return Response.json({
      data: {
        id: 'id/especial',
        archivedAt: archived ? '2026-11-15T12:00:00Z' : null,
        imageUrl: '/foto',
      },
    });
  };
  assert.ok((await productService.setArchived('id/especial', true)).archivedAt);
  assert.equal((await productService.setArchived('id/especial', false)).archivedAt, null);
  assert.deepEqual(states, [true, false]);
  globalThis.fetch = async () => Response.json({}, { status: 503 });
  await assert.rejects(productService.setArchived('id/especial', true), ApiError);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('product service uploads one image and resolves the saved image URL', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' });
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/products/product-id/image'));
    assert.equal(options.method, 'POST');
    const body = options.body;
    assert.ok(body instanceof FormData);
    assert.equal(options.headers.has('Content-Type'), false);
    assert.equal(options.headers.get('Accept'), 'application/json');
    assert.equal(body.getAll('image').length, 1);
    assert.equal(body.get('photoType'), 'STUDIO');
    assert.equal(body.get('image').name, 'photo.png');
    assert.equal(body.get('image').type, 'image/png');
    assert.deepEqual(
      new Uint8Array(await body.get('image').arrayBuffer()),
      new Uint8Array([1, 2, 3]),
    );
    return Response.json(
      {
        data: {
          id: 'product-id',
          imageAssetIds: ['saved-id'],
          imageUrl: '/products/product-id/images/saved-id',
        },
      },
      { status: 201 },
    );
  };
  assert.deepEqual(await productService.uploadImage('product-id', file, 'STUDIO'), {
    id: 'product-id',
    imageAssetIds: ['saved-id'],
    imageUrl:
      (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '') +
      '/products/product-id/images/saved-id',
  });
  assert.equal(calls, 1);
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

test('distingue los errores de lectura del flyer de los errores de generación', async () => {
  const cases = [
    ['CAMPAIGN_ASSET_NOT_FOUND', 404, 'No se encontró el flyer'],
    ['CAMPAIGN_ASSET_FINAL_REQUIRED', 409, 'antes de aprobar'],
    ['CAMPAIGN_ASSET_UNAVAILABLE', 503, 'flyer guardado'],
    ['CAMPAIGN_ASSET_CORRUPTED', 500, 'integridad'],
    ['CAMPAIGN_ASSET_TIMEOUT', 504, 'lectura'],
    ['IMAGE_UNAVAILABLE', 503, 'proveedor'],
  ];
  for (const [code, status, expected] of cases) {
    globalThis.fetch = async () =>
      Response.json({ error: { code, message: 'detalle privado' } }, { status });
    await assert.rejects(
      apiRequest('/campaigns/test/approve'),
      (error) =>
        error instanceof ApiError &&
        error.status === status &&
        error.message.includes(expected) &&
        !error.message.includes('privado'),
    );
  }
});
