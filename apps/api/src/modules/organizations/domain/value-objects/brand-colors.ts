import { InvalidOrganizationProfileError } from '../errors/organization.errors.js';

// Colores de la marca para el flyer. Reemplazan las paletas fijas: la misma plantilla se ve
// distinta en cada empresa.
export interface BrandColors {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly lightBackground: string;
  readonly darkBackground: string;
}

export const BRAND_COLOR_KEYS = [
  'primary',
  'secondary',
  'accent',
  'lightBackground',
  'darkBackground',
] as const satisfies readonly (keyof BrandColors)[];

/** Valida los cinco colores en hexadecimal (#RRGGBB) y los normaliza en mayúsculas. */
export function brandColors(input: unknown, field = 'brandColors'): BrandColors {
  if (!input || typeof input !== 'object') throw new InvalidOrganizationProfileError(field);
  const values = input as Record<string, unknown>;
  const colors = {} as Record<keyof BrandColors, string>;
  for (const key of BRAND_COLOR_KEYS) {
    const value = values[key];
    if (typeof value !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(value.trim()))
      throw new InvalidOrganizationProfileError(`${field}.${key}`);
    colors[key] = value.trim().toUpperCase();
  }
  return Object.freeze(colors);
}

// Lo que el sistema deriva del logo actual al subirlo, sin IA. Es de solo lectura.
export interface LogoTraits {
  readonly isDark: boolean;
  readonly suggestedColors: BrandColors;
}

export function logoTraits(input: { isDark: unknown; suggestedColors: unknown }): LogoTraits {
  if (typeof input.isDark !== 'boolean') throw new InvalidOrganizationProfileError('logo.isDark');
  return Object.freeze({
    isDark: input.isDark,
    suggestedColors: brandColors(input.suggestedColors, 'logo.suggestedColors'),
  });
}
