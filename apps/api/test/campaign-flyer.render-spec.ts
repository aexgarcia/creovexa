import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, errors, type Browser, type LaunchOptions } from 'playwright';
import sharp from 'sharp';
import { Currency } from '#app/domain/value-objects/money';
import { FlyerDesign } from '#app/domain/value-objects/flyer-design';
import { domainFixture, ORG, CAMPAIGN, GENERATION, testId } from './support/campaign-fakes.js';
import type { CampaignRenderResources } from '#app/modules/content-generation/application/ports/campaign-render-resources';
import type { RenderCampaignTemplateInput } from '#app/modules/content-generation/application/ports/template-renderer';
import { PlaywrightTemplateRenderer } from '#app/modules/content-generation/infrastructure/playwright-template-renderer';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { composedRenderExtras } from './support/generation-fakes.js';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';

describe('Flyer composition with real Chromium', () => {
  let directory: string;
  let artifacts: LocalImageArtifacts;
  let visual: Buffer;
  let logo: Buffer;
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'creovexa-render-test-'));
    artifacts = new LocalImageArtifacts(directory);
    // Imagen de prueba sintética, no una llamada al proveedor ni un SVG subido por un usuario.
    visual = await sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><radialGradient id="b"><stop stop-color="#556bff"/><stop offset="1" stop-color="#101629"/></radialGradient><linearGradient id="m"><stop stop-color="#7481a6"/><stop offset="1" stop-color="#151e35"/></linearGradient></defs><rect width="1080" height="1080" fill="url(#b)"/><ellipse cx="580" cy="650" rx="290" ry="70" fill="#080c20" opacity=".6"/><path d="M540 310 C345 310 305 545 375 660 C425 750 655 745 706 641 C775 495 720 310 540 310Z" fill="url(#m)" stroke="#a3b4ec" stroke-width="4"/><path d="M540 320 L540 480" stroke="#131b2e" stroke-width="8"/><rect x="520" y="351" width="40" height="85" rx="20" fill="#98b2ff"/><path d="M378 566 C440 625 639 627 700 563" fill="none" stroke="#91a6ff" stroke-width="7"/></svg>`,
      ),
    )
      .png()
      .toBuffer();
    logo = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#405cff' } })
      .png()
      .toBuffer();
  });
  afterAll(async () => {
    if (directory && resolve(directory).startsWith(resolve(tmpdir()) + '\\creovexa-render-test-'))
      await rm(directory, { recursive: true });
    else if (
      directory &&
      resolve(directory).startsWith(resolve(tmpdir()) + '/creovexa-render-test-')
    )
      await rm(directory, { recursive: true });
  });

  function fixture(withLogo = false) {
    const snapshot = domainFixture().snapshot.data;
    const partial = {
      organizationId: ORG,
      campaignId: CAMPAIGN,
      generationId: GENERATION,
      operationId: testId(700),
      mainImage: testId(701),
      copy: {
        headline: 'Lleva tu juego al siguiente nivel',
        caption: 'Texto social conservado fuera del flyer.',
        cta: 'Obtenlo ya',
        hashtags: ['#gaming'],
      },
      snapshot: {
        ...snapshot,
        cta: 'Obtenlo ya',
        organization: {
          ...snapshot.organization,
          name: 'Creovexa Store',
          logoAssetId: withLogo ? testId(702) : null,
        },
        product: {
          ...snapshot.product,
          name: 'Mouse gamer 502',
          regularPrice: {
            amountMinor: 15000,
            currency: Currency.PEN,
          },
        },
        promotion: {
          amountMinor: 12000,
          currency: Currency.PEN,
          startsAt: '2026-09-30T05:00:00.000Z',
          endsAt: '2026-10-02T04:59:00.000Z',
          conditions: null,
          showDiscount: false,
        },
      },
    };
    // Playwright lee la imagen base de los recursos; el archivo temporal no se usa.
    const input: RenderCampaignTemplateInput = {
      ...partial,
      ...composedRenderExtras(partial.snapshot, {
        reference: testId(703),
        contentType: 'image/png',
        width: 1080,
        height: 1080,
      }),
    };
    const resolved = {
      design: FlyerDesign.create().data,
      mainImage: { bytes: visual, contentType: 'image/png' as const, width: 1080, height: 1080 },
      logo: withLogo
        ? { bytes: logo, contentType: 'image/png' as const, width: 64, height: 64 }
        : null,
    };
    const resources = {
      assertAvailable: vi.fn(),
      load: vi.fn<CampaignRenderResources['load']>().mockResolvedValue(resolved),
    };
    return { input, resources, resolved };
  }

  function observedLaunch() {
    const browsers: Browser[] = [];
    const observation = {
      text: '',
      scripts: 0,
      images: 0,
      unsafeNodes: 0,
      overflow: false,
      requests: [] as string[],
      layout: '',
      accent: '',
      heroWidth: 0,
      regularDecoration: '',
    };
    const launch = async (options: LaunchOptions) => {
      const browser = await chromium.launch(options);
      browsers.push(browser);
      const newContext = browser.newContext.bind(browser);
      vi.spyOn(browser, 'newContext').mockImplementation(async (contextOptions) => {
        const context = await newContext(contextOptions);
        context.on('request', (request) => observation.requests.push(request.url()));
        context.on('page', (page) => {
          const screenshot = page.screenshot.bind(page);
          vi.spyOn(page, 'screenshot').mockImplementation(async (options) => {
            observation.text = await page.locator('body').innerText();
            observation.scripts = await page.locator('script').count();
            observation.images = await page.locator('img').count();
            observation.layout = (await page.locator('.flyer').getAttribute('class')) ?? '';
            observation.accent = (await page.locator('.cta').count())
              ? await page.locator('.cta').evaluate((el) => getComputedStyle(el).backgroundColor)
              : '';
            observation.heroWidth = (await page.locator('.hero').count())
              ? await page.locator('.hero').evaluate((el) => el.getBoundingClientRect().width)
              : 0;
            observation.regularDecoration = (await page.locator('.prices > div').count())
              ? await page
                  .locator('.prices > div')
                  .first()
                  .evaluate((el) => getComputedStyle(el).textDecorationLine)
              : '';
            observation.unsafeNodes = await page
              .locator('iframe,object,embed,[onerror],[onclick]')
              .count();
            observation.overflow = await page.evaluate(() =>
              [...document.querySelectorAll<HTMLElement>('[data-fit]')].some(
                (item) =>
                  item.scrollHeight > item.clientHeight + 1 ||
                  item.scrollWidth > item.clientWidth + 1,
              ),
            );
            return screenshot(options);
          });
        });
        return context;
      });
      return browser;
    };
    return { launch, browsers, observation };
  }

  it('renders a real PNG with exact facts, fits visible text, and closes Chromium', async () => {
    const f = fixture(true);
    const observed = observedLaunch();
    const renderer = new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      observed.launch,
    );
    const output = await renderer.render(f.input);
    const bytes = await artifacts.read({ ...f.input, source: output.final });
    expect(await sharp(bytes).metadata()).toMatchObject({
      format: 'png',
      width: 1080,
      height: 1080,
    });
    expect(bytes.equals(visual)).toBe(false);
    for (const fact of [
      'Mouse gamer 502',
      'Creovexa Store',
      'S/ 150.00',
      'S/ 120.00',
      'Obtenlo ya',
      'Del 30 de setiembre',
      'al 1 de octubre',
    ])
      expect(observed.observation.text).toContain(fact);
    expect(observed.observation.images).toBe(2);
    expect(observed.observation.overflow).toBe(false);
    expect(observed.browsers.every((browser) => !browser.isConnected())).toBe(true);
    await mkdir('.local', { recursive: true });
    await writeFile('.local/phase-6-flyer-preview.png', bytes);
  });

  it('escapes hostile text without executing scripts or requesting external URLs', async () => {
    const f = fixture();
    f.input.copy.headline = '<img src="http://127.0.0.1:9/private" onerror="fetch(\'/secrets\')">';
    f.input.snapshot = {
      ...f.input.snapshot,
      product: { ...f.input.snapshot.product, name: '</div><script>alert(1)</script>' },
    };
    const observed = observedLaunch();
    await new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      observed.launch,
    ).render(f.input);
    expect(observed.observation.text).toContain(f.input.copy.headline);
    expect(observed.observation.text).toContain(f.input.snapshot.product.name);
    expect(observed.observation.scripts).toBe(0);
    expect(observed.observation.unsafeNodes).toBe(0);
    expect(observed.observation.images).toBe(1);
    expect(observed.observation.requests.filter((url) => /^(https?:|file:)/.test(url))).toEqual([]);
    expect(observed.browsers.every((browser) => !browser.isConnected())).toBe(true);
  });
  // COMPOSED traduce el diseño: PRODUCT_PANEL es su composición con foco en el producto y LIGHT,
  // su paleta coral.
  it('renders the product-panel composition and light mode with exact facts', async () => {
    const f = fixture(true);
    f.resources.load.mockResolvedValue({
      ...f.resolved,
      design: { ...f.resolved.design, composition: 'PRODUCT_PANEL', mode: 'LIGHT' },
    });
    const observed = observedLaunch();
    const output = await new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      observed.launch,
    ).render(f.input);
    expect(observed.observation.layout).toContain('product-focus');
    expect(observed.observation.accent).toBe('rgb(199, 67, 53)');
    expect(observed.observation.heroWidth).toBe(952);
    expect(observed.observation.text).toContain('S/ 120.00');
    expect(observed.observation.overflow).toBe(false);
    await mkdir('.local', { recursive: true });
    await writeFile(
      '.local/phase-6-product-focus-preview.png',
      await artifacts.read({ ...f.input, source: output.final }),
    );
  });
  it('honors the hidden elements while retaining product identity', async () => {
    const f = fixture(true);
    f.resources.load.mockResolvedValue({
      ...f.resolved,
      design: {
        ...f.resolved.design,
        composition: 'TYPOGRAPHIC',
        elements: {
          ...f.resolved.design.elements,
          logo: false,
          regularPrice: false,
          promotionPrice: false,
          headline: false,
          cta: false,
          validity: false,
        },
      },
    });
    const observed = observedLaunch();
    await new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      observed.launch,
    ).render(f.input);
    expect(observed.observation.images).toBe(0);
    for (const hidden of ['S/ 150.00', 'S/ 120.00', f.input.copy.headline, f.input.copy.cta])
      expect(observed.observation.text).not.toContain(hidden);
    expect(observed.observation.text).toContain('Mouse gamer 502');
    expect(observed.observation.text).not.toContain('Del 30 de setiembre');
  });
  it('keeps the regular price unstruck when the promotional price is hidden', async () => {
    const f = fixture();
    f.resources.load.mockResolvedValue({
      ...f.resolved,
      design: {
        ...f.resolved.design,
        elements: { ...f.resolved.design.elements, promotionPrice: false },
      },
    });
    const observed = observedLaunch();
    await new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      observed.launch,
    ).render(f.input);
    expect(observed.observation.text).toContain('S/ 150.00');
    expect(observed.observation.text).not.toContain('S/ 120.00');
    expect(observed.observation.regularDecoration).toBe('none');
  });

  it('renders regular price without invented promotion or dates when none exist', async () => {
    const f = fixture();
    f.input.snapshot = { ...f.input.snapshot, promotion: null };
    const observed = observedLaunch();
    await new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      observed.launch,
    ).render(f.input);
    expect(observed.observation.text).toContain('S/ 150.00');
    expect(observed.observation.text).not.toContain('S/ 120.00');
    expect(observed.observation.text).not.toContain('Promoción');
    expect(observed.observation.text).not.toContain('setiembre');
  });

  it('never silently omits a referenced logo', async () => {
    const f = fixture(true);
    f.resources.load.mockResolvedValue({ ...f.resolved, logo: null });
    const launch = vi.fn();
    await expect(
      new PlaywrightTemplateRenderer(f.resources, artifacts, { timeoutMs: 20000 }, launch).render(
        f.input,
      ),
    ).rejects.toMatchObject({ code: 'LOGO_UNAVAILABLE' });
    expect(launch).not.toHaveBeenCalled();
  });

  it('rejects changed CTA and unsupported dimensions before loading resources', async () => {
    const f = fixture();
    const renderer = new PlaywrightTemplateRenderer(f.resources, artifacts, { timeoutMs: 20000 });
    await expect(
      renderer.render({ ...f.input, copy: { ...f.input.copy, cta: 'Inventado' } }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    await expect(
      renderer.render({
        ...f.input,
        snapshot: { ...f.input.snapshot, template: { ...f.input.snapshot.template, height: 1350 } },
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_DIMENSIONS' });
    expect(f.resources.load).not.toHaveBeenCalled();
  });

  it('rejects invalid or mislabelled raster resources before launching Chromium', async () => {
    const f = fixture();
    f.resources.load.mockResolvedValue({
      ...f.resolved,
      mainImage: { ...f.resolved.mainImage, bytes: Buffer.from('<svg onload="alert(1)"></svg>') },
    });
    const launch = vi.fn();
    const renderer = new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      launch,
    );
    await expect(renderer.render(f.input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    f.resources.load.mockResolvedValue({
      ...f.resolved,
      mainImage: { ...f.resolved.mainImage, contentType: 'image/jpeg' },
    });
    await expect(renderer.render(f.input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(launch).not.toHaveBeenCalled();
  });

  it('rejects text that cannot fit instead of clipping exact data', async () => {
    const f = fixture();
    f.input.snapshot = { ...f.input.snapshot, cta: 'X'.repeat(5000) };
    f.input.copy.cta = f.input.snapshot.cta;
    const observed = observedLaunch();
    await expect(
      new PlaywrightTemplateRenderer(
        f.resources,
        artifacts,
        { timeoutMs: 20000 },
        observed.launch,
      ).render(f.input),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(observed.browsers.every((browser) => !browser.isConnected())).toBe(true);
  });

  it('limits concurrent renders and recovers the renderer after completion', async () => {
    const f = fixture();
    let finish!: (value: typeof f.resolved) => void;
    f.resources.load.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const renderer = new PlaywrightTemplateRenderer(f.resources, artifacts, { timeoutMs: 20000 });
    const first = renderer.render(f.input);
    await vi.waitFor(() => expect(f.resources.load).toHaveBeenCalledTimes(1));
    await expect(renderer.render(f.input)).rejects.toMatchObject({ code: 'BUSY' });
    finish(f.resolved);
    await first;
    await expect(renderer.render(f.input)).resolves.toHaveProperty(
      'final.contentType',
      'image/png',
    );
  });

  it('reports safe browser failures and allows retry after timeout', async () => {
    const f = fixture();
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new errors.TimeoutError('private browser error'))
      .mockImplementation((options: LaunchOptions) => chromium.launch(options));
    const renderer = new PlaywrightTemplateRenderer(
      f.resources,
      artifacts,
      { timeoutMs: 20000 },
      launch,
    );
    await expect(renderer.render(f.input)).rejects.toMatchObject({ code: 'TIMEOUT' });
    await expect(renderer.render(f.input)).resolves.toHaveProperty(
      'final.contentType',
      'image/png',
    );
  });

  it('propagates scoped resource failures and does not create a partial flyer', async () => {
    const f = fixture();
    f.resources.load.mockRejectedValue(new CampaignImageError('STALE_RESULT'));
    const launch = vi.fn();
    await expect(
      new PlaywrightTemplateRenderer(f.resources, artifacts, { timeoutMs: 20000 }, launch).render(
        f.input,
      ),
    ).rejects.toMatchObject({ code: 'STALE_RESULT' });
    expect(launch).not.toHaveBeenCalled();
  });
});
