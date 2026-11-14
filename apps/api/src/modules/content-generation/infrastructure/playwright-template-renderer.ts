import { existsSync } from 'node:fs';
import { InvalidFlyerDesignError } from '#app/domain/value-objects/flyer-design';
import { chromium, errors, type Browser, type LaunchOptions } from 'playwright';
import type { RendererConfig } from '#app/config/renderer.config';
import { inspectImageBytes, InvalidImageFileError } from '#app/infrastructure/image-files';
import type {
  CampaignRenderResources,
  RenderRasterImage,
} from '../application/ports/campaign-render-resources.js';
import type {
  RenderCampaignTemplateInput,
  TemplateRenderer,
} from '../application/ports/template-renderer.js';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import { campaignFlyerHtml } from './campaign-flyer-html.js';
import { LocalImageArtifacts } from './local-image-artifacts.js';

async function dataImage(image: RenderRasterImage): Promise<string> {
  const metadata = await inspectImageBytes(image.bytes);
  if (
    metadata.contentType !== image.contentType ||
    metadata.width !== image.width ||
    metadata.height !== image.height
  )
    throw new CampaignImageError('INVALID_OUTPUT');
  return `data:${metadata.contentType};base64,${Buffer.from(image.bytes).toString('base64')}`;
}

export class PlaywrightTemplateRenderer implements TemplateRenderer {
  private rendering = false;
  constructor(
    private readonly resources: CampaignRenderResources,
    private readonly artifacts: LocalImageArtifacts,
    private readonly config: RendererConfig,
    private readonly launch: (options: LaunchOptions) => Promise<Browser> = (options) =>
      chromium.launch(options),
  ) {}

  assertAvailable(): void {
    this.resources.assertAvailable();
    if (!existsSync(chromium.executablePath())) throw new CampaignImageError('UNAVAILABLE');
  }

  async render(input: RenderCampaignTemplateInput) {
    this.assertAvailable();
    if (this.rendering) throw new CampaignImageError('BUSY');
    if (input.snapshot.template.width !== 1080 || input.snapshot.template.height !== 1080)
      throw new CampaignImageError('UNSUPPORTED_DIMENSIONS');
    if (input.copy.cta !== input.snapshot.cta) throw new CampaignImageError('INVALID_OUTPUT');
    this.rendering = true;
    let browser: Browser | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expired = false;
    try {
      const resources = await this.resources.load(input);
      if ((input.snapshot.organization.logoAssetId !== null) !== (resources.logo !== null))
        throw new CampaignImageError('LOGO_UNAVAILABLE');
      const mainImage = await dataImage(resources.mainImage);
      const logo = resources.logo ? await dataImage(resources.logo) : null;
      const html = campaignFlyerHtml(input, mainImage, logo, resources.design);
      timer = setTimeout(() => {
        expired = true;
        void browser?.close().catch(() => {});
      }, this.config.timeoutMs);
      browser = await this.launch({ headless: true, timeout: this.config.timeoutMs });
      if (expired) throw new CampaignImageError('TIMEOUT');
      const context = await browser.newContext({
        viewport: { width: 1080, height: 1080 },
        deviceScaleFactor: 1,
        javaScriptEnabled: false,
        serviceWorkers: 'block',
        offline: true,
        acceptDownloads: false,
        bypassCSP: false,
        locale: 'es-PE',
        timezoneId: 'America/Lima',
      });
      await context.route('**/*', (route) => route.abort());
      const page = await context.newPage();
      page.setDefaultTimeout(this.config.timeoutMs);
      await page.setContent(html, { waitUntil: 'load', timeout: this.config.timeoutMs });
      const fits = await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode()));
        for (const element of document.querySelectorAll<HTMLElement>('[data-fit]')) {
          let size = Number.parseFloat(getComputedStyle(element).fontSize);
          while (
            (element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1) &&
            size > 16
          ) {
            size--;
            element.style.fontSize = `${size}px`;
          }
          if (
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1
          )
            return false;
        }
        return true;
      });
      if (!fits) throw new CampaignImageError('INVALID_OUTPUT');
      const bytes = await page.screenshot({
        type: 'png',
        animations: 'disabled',
        timeout: this.config.timeoutMs,
      });
      const metadata = await inspectImageBytes(bytes);
      if (
        metadata.contentType !== 'image/png' ||
        metadata.width !== 1080 ||
        metadata.height !== 1080
      )
        throw new CampaignImageError('INVALID_OUTPUT');
      if (expired) throw new CampaignImageError('TIMEOUT');
      const reference = await this.artifacts.write(input, bytes);
      if (expired) throw new CampaignImageError('TIMEOUT');
      return { ...metadata, reference };
    } catch (error) {
      if (expired || error instanceof errors.TimeoutError) throw new CampaignImageError('TIMEOUT');
      if (error instanceof CampaignImageError) throw error;
      throw new CampaignImageError(
        error instanceof InvalidImageFileError || error instanceof InvalidFlyerDesignError
          ? 'INVALID_OUTPUT'
          : 'UNAVAILABLE',
      );
    } finally {
      if (timer) clearTimeout(timer);
      try {
        await browser?.close();
      } catch {
        // Keep the safe rendering error if the browser disconnected during cleanup.
      } finally {
        this.rendering = false;
      }
    }
  }
}
