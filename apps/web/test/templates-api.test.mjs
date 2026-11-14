import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/api-client') {
      return nextResolve(new URL('../src/lib/api-client.ts', import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { templateService } = await import('../src/features/templates/services/template.service.ts');
const originalFetch = globalThis.fetch;
const design = {
  layout: 'PRODUCT_FOCUS',
  palette: 'CORAL',
  settings: {
    showLogo: true,
    showRegularPrice: false,
    showPromotionPrice: true,
    showHeadline: true,
    showCta: true,
    showMainImage: true,
  },
};
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const template = {
  id: 'template-1',
  organizationId: 'organization-1',
  name: 'Oferta',
  currentRevision: {
    id: 'revision-1',
    number: 1,
    dimensions: { width: 1080, height: 1080 },
    design,
    createdAt: '2026-09-26T00:00:00Z',
  },
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T00:00:00Z',
};

test('template list preserves server pagination and revision metadata', async () => {
  const page = { data: [template], meta: { page: 2, limit: 20, total: 21, totalPages: 2 } };
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/templates?page=2&limit=20'));
    return Response.json(page);
  };
  assert.deepEqual(await templateService.findAll(2), page);
});

test('template creation sends only persisted fields and returns the stored revision', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.endsWith('/templates'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      name: 'Oferta',
      dimensions: { width: 1080, height: 1080 },
    });
    return Response.json({ data: template }, { status: 201 });
  };
  const result = await templateService.create({
    name: ' Oferta ',
    dimensions: { width: 1080, height: 1080 },
    settings: { showLogo: true },
    isActive: true,
  });
  assert.deepEqual(result, template);
  assert.equal(calls, 1);
});

test('template detail encodes identifiers and never replaces failures with fixtures', async () => {
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/templates/missing%2Fid'));
    return Response.json({ error: 'missing' }, { status: 404 });
  };
  await assert.rejects(templateService.findById('missing/id'), (error) => error.status === 404);
  globalThis.fetch = async () => {
    throw new TypeError('offline');
  };
  await assert.rejects(
    templateService.create({ name: 'Oferta', dimensions: { width: 1080, height: 1080 } }),
    (error) => error.status === 0,
  );
});

test('template create and update preserve the complete selected design', async () => {
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    calls.push({ method: options.method, body: JSON.parse(options.body) });
    return Response.json({ data: template });
  };
  assert.deepEqual(
    await templateService.create({
      name: 'Oferta',
      dimensions: { width: 1080, height: 1080 },
      design,
    }),
    template,
  );
  assert.deepEqual(
    await templateService.update(template.id, {
      name: 'Oferta',
      expectedRevisionId: 'revision-1',
      design,
    }),
    template,
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body.design, design);
  assert.deepEqual(calls[1].body, { name: 'Oferta', expectedRevisionId: 'revision-1', design });
});
