import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import {
  CAMPAIGN,
  GENERATION,
  ORG,
  domainFixture,
  testId,
} from '../../../support/campaign-fakes.js';
import { DEFAULT_FLYER_DESIGN } from '#app/domain/value-objects/flyer-design';
import { buildFlyerBrief } from '#app/modules/content-generation/application/flyer-brief';
import { logoArea } from '#app/modules/content-generation/application/logo-area';
import type { RenderCampaignTemplateInput } from '#app/modules/content-generation/application/ports/template-renderer';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { LogoOverlayComposer } from '#app/modules/content-generation/infrastructure/logo-overlay-composer';

const scope = {
  organizationId: ORG,
  campaignId: CAMPAIGN,
  generationId: GENERATION,
  operationId: testId(820),
};

describe('LogoOverlayComposer', () => {
  let directory: string;
  let artifacts: LocalImageArtifacts;
  // Logo oscuro de 2:1 sobre fondo transparente.
  let logo: Buffer;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'creovexa-logo-overlay-'));
    artifacts = new LocalImageArtifacts(directory);
    logo = await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect x="20" y="20" width="160" height="60" fill="#111111"/></svg>',
      ),
    )
      .png()
      .toBuffer();
  });
  afterAll(async () => {
    if (
      directory &&
      resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-logo-overlay-')
    )
      await rm(directory, { recursive: true });
  });

  async function input(options: {
    background: string;
    format?: 'SQUARE' | 'STORY';
    withLogo?: boolean;
  }): Promise<RenderCampaignTemplateInput> {
    const format = options.format ?? 'SQUARE';
    const [width, height] = format === 'SQUARE' ? [1024, 1024] : [1152, 2048];
    const base = await sharp({
      create: { width, height, channels: 3, background: options.background },
    })
      .png()
      .toBuffer();
    const data = domainFixture().snapshot.data;
    const snapshot = {
      ...data,
      template: {
        ...data.template,
        width: 1080,
        height: format === 'SQUARE' ? 1080 : 1920,
        design: { ...DEFAULT_FLYER_DESIGN, format },
      },
    };
    const withLogo = options.withLogo ?? true;
    return {
      ...scope,
      mainImage: testId(821),
      baseImage: {
        reference: await artifacts.write(scope, base),
        contentType: 'image/png',
        width,
        height,
      },
      copy: { headline: 'Titular', caption: 'Texto', cta: data.cta, hashtags: [] },
      brief: buildFlyerBrief(
        snapshot,
        { headline: 'Titular', subheadline: null },
        withLogo ? { assetId: testId(822), isDark: true, aspectRatio: 2 } : null,
      ),
      logo: withLogo
        ? {
            reference: await artifacts.write(scope, logo),
            contentType: 'image/png',
            width: 200,
            height: 100,
          }
        : null,
      snapshot,
    };
  }

  it('pastes a dark logo directly on a light corner, at the final size', async () => {
    const value = await input({ background: '#F4F4F4' });
    const result = await new LogoOverlayComposer(artifacts).render(value);
    expect(result.final).toMatchObject({ contentType: 'image/png', width: 1080, height: 1080 });
    expect(result.logoPlacement).toBe('DIRECT');
    const bytes = await artifacts.read({ ...scope, source: result.final });
    // El centro del logo queda con su color original, sin recolorear.
    const area = logoArea(1080, 1080, 2, 'TOP_RIGHT');
    const { data } = await sharp(bytes)
      .extract({
        left: area.x + area.padding + Math.round(area.logo.width / 2),
        top: area.y + area.padding + Math.round(area.logo.height / 2),
        width: 1,
        height: 1,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect([...data.subarray(0, 3)]).toEqual([0x11, 0x11, 0x11]);
    // La revisión recibe, ampliado, lo que había bajo el logo en la imagen de la IA.
    expect(result.areaUnderLogo!.width).toBe(area.logo.width * 2);
  });

  it('puts the logo on a veil when the corner does not contrast', async () => {
    const result = await new LogoOverlayComposer(artifacts).render(
      await input({ background: '#151515' }),
    );
    expect(result.logoPlacement).toBe('VEIL');
  });

  it('produces a story at 1080 × 1920', async () => {
    const result = await new LogoOverlayComposer(artifacts).render(
      await input({ background: '#F4F4F4', format: 'STORY' }),
    );
    expect(result.final).toMatchObject({ width: 1080, height: 1920 });
  });

  it('returns the AI flyer resized when the template has no logo', async () => {
    const result = await new LogoOverlayComposer(artifacts).render(
      await input({ background: '#F4F4F4', withLogo: false }),
    );
    expect(result).toMatchObject({ areaUnderLogo: null, logoPlacement: null });
  });

  it('refuses a logo the brief did not reserve, and sizes that are not a format', async () => {
    const value = await input({ background: '#F4F4F4' });
    await expect(
      new LogoOverlayComposer(artifacts).render({
        ...value,
        brief: { ...value.brief, logo: null },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    await expect(
      new LogoOverlayComposer(artifacts).render({
        ...value,
        snapshot: { ...value.snapshot, template: { ...value.snapshot.template, height: 1000 } },
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_DIMENSIONS' });
    expect(new LogoOverlayComposer(artifacts).supports({ width: 1080, height: 1350 })).toBe(true);
    expect(new LogoOverlayComposer(artifacts).supports({ width: 1024, height: 1024 })).toBe(false);
  });
});
