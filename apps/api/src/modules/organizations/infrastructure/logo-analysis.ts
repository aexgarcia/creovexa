import sharp from 'sharp';
import type { BrandColors } from '../domain/value-objects/brand-colors.js';

// Deriva del logo, sin IA, si es oscuro y qué colores de marca proponer. El usuario puede
// corregir los colores; el logo nunca se modifica. Versión de referencia, con la prueba que la
// validó: apps/api/evaluation/flyer-quality/marca.mjs.

type Rgb = readonly [number, number, number];

export interface LogoAnalysis {
  isDark: boolean;
  suggestedColors: BrandColors;
}

const hex = (color: Rgb) =>
  '#' +
  color
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
const luminance = ([r, g, b]: Rgb) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const saturation = (color: Rgb) => {
  const max = Math.max(...color);
  return max === 0 ? 0 : (max - Math.min(...color)) / max;
};
const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
// Para un logo sin color propio (todo transparente o blanco).
const NEUTRAL: Rgb = [17, 24, 39];

// Píxeles opacos y no casi blancos: el blanco suele ser fondo o espacio dentro del logo.
async function inkPixels(bytes: Uint8Array): Promise<Rgb[]> {
  const { data, info } = await sharp(bytes, { limitInputPixels: 16_000_000 })
    .resize(96, 96, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels: Rgb[] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const color: Rgb = [data[i], data[i + 1], data[i + 2]];
    if (data[i + 3] < 128 || color.every((v) => v > 235)) continue;
    pixels.push(color);
  }
  return pixels;
}

// Agrupa en cubetas de 32 niveles por canal, promedia cada una y se queda con los grupos que
// tienen al menos el 2 % de los píxeles y se distinguen entre sí.
function distinctGroups(pixels: Rgb[]): Rgb[] {
  const buckets = new Map<string, { sum: [number, number, number]; count: number }>();
  for (const color of pixels) {
    const key = color.map((v) => v >> 5).join(',');
    const bucket = buckets.get(key) ?? { sum: [0, 0, 0], count: 0 };
    bucket.sum = [bucket.sum[0] + color[0], bucket.sum[1] + color[1], bucket.sum[2] + color[2]];
    bucket.count++;
    buckets.set(key, bucket);
  }
  const groups = [...buckets.values()]
    .filter((b) => b.count >= pixels.length * 0.02)
    .sort((a, b) => b.count - a.count)
    .map((b): Rgb => [b.sum[0] / b.count, b.sum[1] / b.count, b.sum[2] / b.count]);
  const distinct: Rgb[] = [];
  for (const color of groups)
    if (distinct.every((d) => distance(d, color) > 60)) distinct.push(color);
  return distinct;
}

/**
 * El dominante es el primario, el siguiente distinto el secundario y el más saturado el acento.
 * Los fondos se derivan del primario. El logo es oscuro si su tinta, en promedio, lo es.
 */
export async function analyzeLogo(bytes: Uint8Array): Promise<LogoAnalysis> {
  const pixels = await inkPixels(bytes);
  const groups = distinctGroups(pixels);
  const primary = groups[0] ?? NEUTRAL;
  const secondary = groups[1] ?? mix(primary, WHITE, 0.4);
  const accent = [...groups].sort((a, b) => saturation(b) - saturation(a))[0] ?? secondary;
  const isDark =
    pixels.length > 0 && pixels.reduce((sum, c) => sum + luminance(c), 0) / pixels.length < 0.5;
  return {
    isDark,
    suggestedColors: {
      primary: hex(primary),
      secondary: hex(secondary),
      accent: hex(accent),
      lightBackground: hex(mix(primary, WHITE, 0.92)),
      darkBackground: hex(mix(primary, BLACK, 0.75)),
    },
  };
}
