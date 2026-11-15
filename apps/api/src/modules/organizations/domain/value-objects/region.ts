import { Currency } from '#app/domain/value-objects/money';
import { InvalidOrganizationProfileError } from '../errors/organization.errors.js';

// Dónde opera la empresa: decide el idioma de los textos, el formato de precios y fechas, y la
// hora local con la que se muestran las vigencias.
export interface Region {
  readonly country: string;
  readonly locale: string;
  readonly timeZone: string;
  readonly currency: Currency;
}

export type RegionInput = Partial<Region>;

// La región con la que funcionaba el sistema antes de que fuera configurable.
export const DEFAULT_REGION: Region = Object.freeze({
  country: 'PE',
  locale: 'es-PE',
  timeZone: 'America/Lima',
  currency: Currency.PEN,
});

function country(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Z]{2}$/.test(value.trim().toUpperCase()))
    throw new InvalidOrganizationProfileError('region.country');
  return value.trim().toUpperCase();
}

function locale(value: unknown): string {
  try {
    if (typeof value !== 'string' || !value.trim()) throw new RangeError();
    const [canonical] = Intl.getCanonicalLocales(value.trim());
    if (!canonical) throw new RangeError();
    return canonical;
  } catch {
    throw new InvalidOrganizationProfileError('region.locale');
  }
}

function timeZone(value: unknown): string {
  try {
    if (typeof value !== 'string' || !value.trim()) throw new RangeError();
    // Devuelve el nombre IANA canónico; rechaza zonas inexistentes con RangeError.
    return new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).resolvedOptions().timeZone;
  } catch {
    throw new InvalidOrganizationProfileError('region.timeZone');
  }
}

function currency(value: unknown): Currency {
  if (!Object.values(Currency).includes(value as Currency))
    throw new InvalidOrganizationProfileError('region.currency');
  return value as Currency;
}

/** Completa con la región actual los campos que no cambian y valida el resultado. */
export function region(input: RegionInput, base: Region = DEFAULT_REGION): Region {
  return Object.freeze({
    country: country(input.country ?? base.country),
    locale: locale(input.locale ?? base.locale),
    timeZone: timeZone(input.timeZone ?? base.timeZone),
    currency: currency(input.currency ?? base.currency),
  });
}
