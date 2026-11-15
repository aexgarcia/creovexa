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

test('filtra plantillas archivadas y mantiene activos por defecto para campañas', async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return Response.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  };
  await templateService.findAll();
  await templateService.findAll(1, undefined, 'archived');
  await templateService.findAll(1, undefined, 'all');
  assert.ok(urls[0].endsWith('/templates?page=1&limit=20&status=active'));
  assert.ok(urls[1].endsWith('&status=archived'));
  assert.ok(urls[2].endsWith('&status=all'));
});

test('archiva y restaura una plantilla sin alterar la revisión recibida', async () => {
  const revision = { id: 'revision-original', number: 3 };
  const states = [];
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).endsWith('/templates/id%2Fespecial/archive'));
    assert.equal(options.method, 'PATCH');
    const { archived } = JSON.parse(options.body);
    states.push(archived);
    return Response.json({
      data: {
        id: 'id/especial',
        archivedAt: archived ? '2026-11-15T12:00:00Z' : null,
        currentRevision: revision,
      },
    });
  };
  assert.deepEqual(
    (await templateService.setArchived('id/especial', true)).currentRevision,
    revision,
  );
  assert.equal((await templateService.setArchived('id/especial', false)).archivedAt, null);
  assert.deepEqual(states, [true, false]);
  globalThis.fetch = async () => Response.json({}, { status: 503 });
  await assert.rejects(templateService.setArchived('id/especial', true));
});
const design = {
  format: 'STORY',
  composition: 'PRODUCT_PANEL',
  style: 'BOLD',
  mode: 'LIGHT',
  background: 'BRAND_COLOR',
  logoPosition: 'TOP_LEFT',
  textDensity: 'BALANCED',
  elements: {
    logo: true,
    headline: true,
    subheadline: false,
    productName: true,
    keyAttributes: 2,
    regularPrice: false,
    promotionPrice: true,
    validity: true,
    cta: true,
    contact: false,
    legalText: false,
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
    assert.ok(url.endsWith('/templates?page=2&limit=20&status=active'));
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
    // Sin dimensiones: salen del formato del diseño.
    assert.deepEqual(JSON.parse(options.body), { name: 'Oferta' });
    return Response.json({ data: template }, { status: 201 });
  };
  const result = await templateService.create({
    name: ' Oferta ',
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
  await assert.rejects(templateService.create({ name: 'Oferta' }), (error) => error.status === 0);
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

test('lists the base templates of the system', async () => {
  globalThis.fetch = async (url) => {
    assert.ok(url.endsWith('/templates/base'));
    return Response.json({
      data: [{ key: 'LAUNCH', name: 'Lanzamiento', intendedFor: 'x', design }],
    });
  };
  assert.equal((await templateService.findBase())[0].key, 'LAUNCH');
});

test('adds and removes style references against the current revision', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: options.body });
    return Response.json({ data: template });
  };
  await templateService.addStyleReference('template-1', 'revision-1', new File(['x'], 'r.png'));
  await templateService.removeStyleReference('template-1', 'revision-2', 'asset-1');
  assert.ok(calls[0].url.endsWith('/templates/template-1/style-references'));
  assert.equal(calls[0].body.get('expectedRevisionId'), 'revision-1');
  assert.ok(
    calls[1].url.endsWith(
      '/templates/template-1/style-references/asset-1?expectedRevisionId=revision-2',
    ),
  );
  assert.equal(calls[1].method, 'DELETE');
});
