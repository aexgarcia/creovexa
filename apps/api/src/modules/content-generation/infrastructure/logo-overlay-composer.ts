import { ImageGenerationError } from '#app/modules/content-generation/application/errors/image-generation.error';
import sharp, { type OverlayOptions } from 'sharp';
import { FORMAT_SIZES } from '#app/domain/value-objects/flyer-design';
import { inspectImageBytes } from '#app/infrastructure/image-files';

import type { FlyerBrief } from '../application/flyer-brief.js';
import { logoArea, type LogoArea, type Rect } from '../application/logo-area.js';
import type {
  FlyerComposition,
  RenderCampaignTemplateInput,
  TemplateRenderer,
} from '../application/ports/template-renderer.js';
import { LocalImageArtifacts } from './local-image-artifacts.js';

// Compositor de AI_FULL (ADR-0009): lleva el flyer de la IA al tamaño final y pega el logo
// original, sin recolorearlo ni redibujarlo. Directo sobre el fondo si su contorno contrasta
// con lo que dibujó la IA; si no, sobre un velo translúcido de bordes difusos. Portado de
// evaluation/flyer-quality/logo.mjs, con los mismos umbrales probados.

// Un píxel del contorno se lee si contrasta 3:1 con el fondo (WCAG para gráficos y texto
// grande) o, si ni sobre su fondo de diseño llega a eso, si conserva el 75 % del contraste que
// tiene sobre ese fondo. El fondo de diseño es blanco para logos oscuros y negro para claros.
const MIN_CONTRAST = 3;
const DESIGN_FRACTION = 0.75;
const READABLE_OUTLINE = 0.85;
// Desviación de la luminancia del fondo bajo el logo: más que esto es un fondo cargado.
const BUSY_BACKGROUND = 0.1;

const luminance = (r: number, g: number, b: number) => {
  const linear = (value: number) =>
    (value /= 255) <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

type Logo = NonNullable<FlyerBrief['logo']>;

async function fittedLogo(logo: Buffer, area: LogoArea): Promise<Buffer> {
  return sharp(logo)
    .resize(area.logo.width, area.logo.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer();
}

/**
 * Mide, sin IA, si el logo se lee pegado directo: compara cada píxel del contorno del logo
 * (opaco y junto a uno transparente) con el píxel del flyer que queda debajo. El relleno
 * interior no cuenta: contrasta con el propio logo, no con el fondo.
 */
async function measure(flyer: Buffer, logoPixels: Buffer, area: LogoArea, isDark: boolean) {
  const designBackground = isDark ? 1 : 0;
  const { width: w, height: h } = area.logo;
  const background = await sharp(flyer)
    .extract({ left: area.x + area.padding, top: area.y + area.padding, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer();
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && logoPixels[(y * w + x) * 4 + 3]! >= 128;
  let outline = 0;
  let readable = 0;
  let sum = 0;
  let sumSquares = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const below = luminance(background[i * 3]!, background[i * 3 + 1]!, background[i * 3 + 2]!);
      sum += below;
      sumSquares += below * below;
      if (!opaque(x, y)) continue;
      if (opaque(x - 1, y) && opaque(x + 1, y) && opaque(x, y - 1) && opaque(x, y + 1)) continue;
      outline++;
      const own = luminance(logoPixels[i * 4]!, logoPixels[i * 4 + 1]!, logoPixels[i * 4 + 2]!);
      const required = Math.min(MIN_CONTRAST, DESIGN_FRACTION * contrast(own, designBackground));
      if (contrast(own, below) >= required) readable++;
    }
  const n = w * h;
  const deviation = Math.sqrt(Math.max(sumSquares / n - (sum / n) ** 2, 0));
  const proportion = outline ? readable / outline : 0;
  return {
    backgroundLuminance: sum / n,
    direct: proportion >= READABLE_OUTLINE && deviation <= BUSY_BACKGROUND,
  };
}

// El fondo de la zona desenfocado y teñido, translúcido y de bordes difusos, para que se funda
// con el diseño en vez de verse como una tarjeta encima.
async function veil(flyer: Buffer, area: LogoArea, color: string, opacity: number) {
  const radius = Math.round(area.height * 0.3);
  const edge = Math.round(area.height * 0.08);
  const rect = (fill: string) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${area.width}" height="${area.height}"><defs><filter id="b"><feGaussianBlur stdDeviation="${edge}"/></filter></defs><rect x="${edge * 1.5}" y="${edge * 1.5}" width="${area.width - edge * 3}" height="${area.height - edge * 3}" rx="${radius}" ${fill} filter="url(#b)"/></svg>`,
    );
  const blurred = await sharp(flyer)
    .extract({ left: area.x, top: area.y, width: area.width, height: area.height })
    .blur(Math.max(area.height * 0.12, 1))
    .png()
    .toBuffer();
  return sharp(blurred)
    .ensureAlpha()
    .composite([
      { input: rect(`fill="${color}" fill-opacity="${opacity}"`) },
      { input: rect('fill="#fff"'), blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
}

/** Pega el logo y devuelve el flyer, cómo quedó y la zona que de verdad tapa. */
export async function overlayLogo(flyer: Buffer, logo: Buffer, brief: Logo) {
  const { width, height } = await sharp(flyer).metadata();
  const meta = await sharp(logo).metadata();
  const area = logoArea(width!, height!, meta.width! / meta.height!, brief.position);
  const pixels = await fittedLogo(logo, area);
  const measured = await measure(flyer, pixels, area, brief.isDark);
  const layers: OverlayOptions[] = [];
  if (!measured.direct) {
    // Lo justo para que el logo se lea: casi transparente si el fondo ya se acerca al tono del
    // velo, más denso si es el opuesto (logo oscuro sobre un flyer oscuro).
    const distance = brief.isDark ? 1 - measured.backgroundLuminance : measured.backgroundLuminance;
    const opacity = Math.round((0.45 + 0.45 * distance) * 100) / 100;
    layers.push({
      input: await veil(flyer, area, brief.veilColor, opacity),
      left: area.x,
      top: area.y,
    });
  }
  layers.push({
    input: await sharp(pixels, {
      raw: { width: area.logo.width, height: area.logo.height, channels: 4 },
    })
      .png()
      .toBuffer(),
    left: area.x + area.padding,
    top: area.y + area.padding,
  });
  const png = await sharp(flyer).composite(layers).png().toBuffer();
  // Lo que queda tapado: el logo, o el logo con medio relleno si lleva velo (sus bordes son
  // difusos). Un titular que empieza justo debajo del logo no cuenta.
  const half = Math.round(area.padding / 2);
  const covered: Rect = measured.direct
    ? { x: area.x + area.padding, y: area.y + area.padding, ...area.logo }
    : {
        x: area.x + half,
        y: area.y + half,
        width: area.logo.width + area.padding,
        height: area.logo.height + area.padding,
      };
  return { png, placement: measured.direct ? ('DIRECT' as const) : ('VEIL' as const), covered };
}

export class LogoOverlayComposer implements TemplateRenderer {
  constructor(private readonly artifacts: LocalImageArtifacts) {}

  assertAvailable(): void {}

  supports(size: { width: number; height: number }): boolean {
    return Object.values(FORMAT_SIZES).some(
      (format) => format.width === size.width && format.height === size.height,
    );
  }

  async render(input: RenderCampaignTemplateInput): Promise<FlyerComposition> {
    const { width, height } = input.brief.output;
    if (
      width !== input.snapshot.template.width ||
      height !== input.snapshot.template.height ||
      !this.supports({ width, height })
    )
      throw new ImageGenerationError('UNSUPPORTED_DIMENSIONS');
    // Sin logo en el brief, la IA no reservó esquina: pegarlo taparía el diseño.
    if (Boolean(input.logo) !== Boolean(input.brief.logo))
      throw new ImageGenerationError('INVALID_OUTPUT');
    try {
      const base = await this.artifacts.read({ ...input, source: input.baseImage });
      // La IA genera en su propio tamaño (1024 × 1280…); el flyer final es el del formato.
      const resized = await sharp(base).resize(width, height, { fit: 'cover' }).png().toBuffer();
      let final = resized;
      let areaUnderLogo = null;
      let logoPlacement: FlyerComposition['logoPlacement'] = null;
      if (input.logo && input.brief.logo) {
        const logo = await this.artifacts.read({ ...input, source: input.logo });
        const placed = await overlayLogo(resized, logo, input.brief.logo);
        final = placed.png;
        logoPlacement = placed.placement;
        // La revisión ve, ampliado, lo que la IA dibujó donde ahora está el logo.
        const crop = await sharp(resized)
          .extract({
            left: placed.covered.x,
            top: placed.covered.y,
            width: placed.covered.width,
            height: placed.covered.height,
          })
          .resize({ width: placed.covered.width * 2 })
          .png()
          .toBuffer();
        areaUnderLogo = await this.artifact(input, crop);
      }
      return { final: await this.artifact(input, final), areaUnderLogo, logoPlacement };
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error;
      throw new ImageGenerationError('INVALID_OUTPUT');
    }
  }

  private async artifact(input: RenderCampaignTemplateInput, bytes: Buffer) {
    const metadata = await inspectImageBytes(bytes);
    return { ...metadata, reference: await this.artifacts.write(input, bytes) };
  }
}
