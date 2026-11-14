import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const paths = {
      '@/lib/api-client': '../src/lib/api-client.ts',
      '@/features/products/schemas/product-price':
        '../src/features/products/schemas/product-price.ts',
    };
    return nextResolve(
      paths[specifier] ? new URL(paths[specifier], import.meta.url).href : specifier,
      context,
    );
  },
});
const { campaignInput } =
  await import('../src/features/campaigns/schemas/stored-campaign-input.ts');
const { campaignApi } = await import('../src/features/campaigns/services/campaign-api.service.ts');
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('requesting the flyer pins the reviewed copy generation and returns at once', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/campaigns/campaign%2F1/image'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { generationId: 'generation-1' });
    return Response.json(
      {
        data: {
          generationId: 'generation-1',
          status: 'PENDING',
          failureCode: null,
          contentId: null,
          finalAssetUrl: null,
        },
      },
      { status: 202 },
    );
  };
  const result = await campaignApi.generateImage('campaign/1', 'generation-1');
  assert.equal(result.status, 'PENDING');
  assert.equal(result.finalAssetUrl, null);
  assert.equal(calls, 1);
});

test('flyer status resolves only the final URL once the job is ready', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/campaigns/campaign%2F1/image'));
    assert.equal(options.method ?? 'GET', 'GET');
    return Response.json({
      data: {
        generationId: 'generation-1',
        status: 'READY',
        failureCode: null,
        contentId: 'content-1',
        finalAssetUrl: '/campaigns/campaign-1/assets/final-1',
      },
    });
  };
  const result = await campaignApi.imageStatus('campaign/1');
  assert.equal(result.status, 'READY');
  assert.ok(result.finalAssetUrl.startsWith('http'));
  assert.ok(result.finalAssetUrl.endsWith('/campaigns/campaign-1/assets/final-1'));
  assert.equal(calls, 1);
});

test('flyer status is empty before the first request', async () => {
  globalThis.fetch = async () => Response.json({ data: null });
  assert.equal(await campaignApi.imageStatus('campaign-1'), null);
});

test('detail and list resolve the final asset separately from the product photo', async () => {
  const campaign = {
    id: 'campaign-1',
    productImageUrl: '/products/product-1/images/photo-1',
    candidateContent: { id: 'content-1', finalAssetUrl: '/campaigns/campaign-1/assets/final-1' },
  };
  globalThis.fetch = async (url) =>
    Response.json(
      url.includes('?')
        ? { data: [campaign], meta: { page: 1, totalPages: 1 } }
        : { data: campaign },
    );
  for (const result of [await campaignApi.get('campaign-1'), (await campaignApi.list()).data[0]]) {
    assert.ok(result.productImageUrl.endsWith('/products/product-1/images/photo-1'));
    assert.ok(
      result.candidateContent.finalAssetUrl.endsWith('/campaigns/campaign-1/assets/final-1'),
    );
    assert.notEqual(result.productImageUrl, result.candidateContent.finalAssetUrl);
  }
});

test('failed flyer generation is not retried automatically and hides provider details', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json(
      { error: { code: 'IMAGE_RATE_LIMITED', message: 'private details' } },
      { status: 429 },
    );
  };
  await assert.rejects(
    campaignApi.generateImage('campaign-1', 'generation-1'),
    (error) =>
      error.status === 429 &&
      error.message.includes('límite') &&
      !error.message.includes('private'),
  );
  assert.equal(calls, 1);
});
const product = { id: 'product-1', regularPrice: { amountMinor: 1000, currency: 'PEN' } };
const template = { id: 'template-1', currentRevision: { id: 'revision-3' } };
const draft = {
  title: ' Oferta ',
  cta: ' Comprar ',
  instructions: '',
  promotionPrice: '',
  startsAt: '',
  endsAt: '',
};

test('creation pins the selected revision and omits an unused promotion', () => {
  assert.deepEqual(campaignInput(draft, product, template), {
    productId: 'product-1',
    templateId: 'template-1',
    templateRevisionId: 'revision-3',
    title: 'Oferta',
    cta: 'Comprar',
    instructions: '',
  });
});
test('promotion preserves cents and converts explicit offsets to UTC', () => {
  const input = campaignInput(
    {
      ...draft,
      promotionPrice: '0,29',
      startsAt: '2026-10-01T09:00:00-05:00',
      endsAt: '2026-10-02T09:00:00-05:00',
    },
    product,
    template,
  );
  assert.deepEqual(input.promotion, {
    amountMinor: 29,
    currency: 'PEN',
    startsAt: '2026-10-01T14:00:00.000Z',
    endsAt: '2026-10-02T14:00:00.000Z',
  });
});
test('rejects invalid promotions and dates without a price', () => {
  for (const changes of [
    { promotionPrice: '10' },
    { promotionPrice: '11' },
    { promotionPrice: '-1' },
    { promotionPrice: '1.001' },
    { startsAt: '2026-10-01T09:00' },
    { promotionPrice: '2', startsAt: 'bad' },
    { promotionPrice: '2', startsAt: '2026-10-02T09:00', endsAt: '2026-10-01T09:00' },
    { title: ' ' },
  ]) {
    assert.throws(() => campaignInput({ ...draft, ...changes }, product, template));
  }
});
test('create sends the domain request once and unwraps persisted campaign', async () => {
  const input = campaignInput(draft, product, template);
  const campaign = { id: 'campaign-1', ...input, status: 'DRAFT' };
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/campaigns'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), input);
    return Response.json({ data: campaign }, { status: 201 });
  };
  assert.deepEqual(await campaignApi.create(input), campaign);
  assert.equal(calls, 1);
});
test('approval sends the reviewed content ID and propagates conflict without retry', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/campaigns/campaign-1/approve'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { contentId: 'reviewed-revision' });
    return Response.json({ error: 'conflict' }, { status: 409 });
  };
  await assert.rejects(
    campaignApi.approve('campaign-1', 'reviewed-revision'),
    (error) => error.status === 409,
  );
  assert.equal(calls, 1);
});
test('publication listing retains independent failures, last attempt and nullable publication date', async () => {
  const page = {
    data: [
      {
        id: 'pub-1',
        status: 'FAILED',
        failureCode: 'TIMEOUT',
        attempt: { number: 2 },
        publishedAt: null,
      },
    ],
    meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
  };
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/campaigns/campaign%2F1/publications?page=2&limit=20'));
    return Response.json(page);
  };
  assert.deepEqual(await campaignApi.publications('campaign/1', 2), page);
});
