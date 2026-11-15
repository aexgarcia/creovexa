import type { FlyerBrief } from './flyer-brief.js';

// Compara lo que un modelo de visión leyó en el flyer con el brief (ADR-0009, paso 4). Portado de
// evaluation/flyer-quality/comparar.mjs y verificar.mjs. Funciones puras: no llaman a la API.

export const FLYER_TEXT_KINDS = [
  'product_name',
  'headline',
  'cta',
  'regular_price',
  'promotion_price',
  'other_price',
  'validity',
  'logo',
  'product_text',
  'other',
] as const;
export type FlyerTextKind = (typeof FLYER_TEXT_KINDS)[number];

// Transcripción del flyer final, hecha sin conocer los textos esperados para no inducirla.
export interface FlyerReading {
  texts: { text: string; kind: FlyerTextKind }[];
  logo: { visible: boolean; text: string };
}

// Revisión del recorte de la imagen de la IA que el logo va a tapar.
export interface LogoAreaReview {
  hasText: boolean;
  text: string;
  hasObject: boolean;
  object: string;
}

export interface FlyerVerification {
  ok: boolean;
  prices: boolean;
  dates: boolean;
  texts: boolean;
  logoCoversText: boolean;
  observations: string[];
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};
const PRICE_ROLES = new Set(['price', 'regularPrice', 'promotionPrice']);

// Mayúsculas y espacios no cuentan (un diseño puede poner el CTA en mayúsculas); las tildes y
// la puntuación sí.
export function normalizeReading(text: string): string {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}
const compact = (text: string) => normalizeReading(text).replace(/\s/g, '');

function currency(text: string): string | null {
  if (/US\s*\$|USD/i.test(text)) return 'USD';
  if (/€|EUR/i.test(text)) return 'EUR';
  if (/S\s*\/|PEN|soles/i.test(text)) return 'PEN';
  if (/\$/.test(text)) return 'USD';
  return null;
}

// Importes en unidades menores. Acepta 1,299.00, 1.299,00, 1299 y 89.9.
export function amounts(text: string): number[] {
  const found: number[] = [];
  for (const match of String(text).matchAll(/\d[\d.,\s]*\d|\d/g)) {
    const raw = match[0].replace(/\s/g, '');
    let whole = raw;
    let decimals = '';
    const decimal = raw.match(/[.,](\d{1,2})$/);
    if (decimal) {
      whole = raw.slice(0, -decimal[0].length);
      decimals = decimal[1]!;
    }
    whole = whole.replace(/[.,]/g, '');
    if (!/^\d+$/.test(whole)) continue;
    found.push(Number(whole) * 100 + Number(decimals.padEnd(2, '0') || 0));
  }
  return found;
}

interface ReadPrice {
  currency: string | null;
  amountMinor: number;
}

export function readPrice(text: string): ReadPrice | null {
  const found = amounts(text);
  return found.length === 1 ? { currency: currency(text), amountMinor: found[0]! } : null;
}

export function readDates(text: string): { day: number; month: number }[] {
  const dates: { day: number; month: number }[] = [];
  const value = normalizeReading(text);
  for (const match of value.matchAll(/(\d{1,2})\s+de\s+([a-záéíóú]+)/g)) {
    const month = MONTHS[match[2]!];
    if (month) dates.push({ day: Number(match[1]), month });
  }
  for (const match of value.matchAll(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/g))
    dates.push({ day: Number(match[1]), month: Number(match[2]) });
  return dates;
}

const priceKey = (price: ReadPrice) => `${price.currency ?? '?'}:${price.amountMinor}`;
const dateKey = (date: { day: number; month: number }) => `${date.day}/${date.month}`;
// Un mismo precio puede repetirse (por ejemplo, en el botón); importa qué valores aparecen.
function sameSet(a: string[], b: string[]): boolean {
  const x = new Set(a);
  const y = new Set(b);
  return x.size === y.size && [...x].every((value) => y.has(value));
}

/**
 * Precios que la lectura ve en el flyer:
 * - un diseño puede separar el símbolo del importe ("S/" encima de "74.90"): el símbolo suelto
 *   se aplica al importe siguiente;
 * - "500g" o "100% ARÁBICA" impresos en el producto no son precios aunque la lectura los
 *   clasifique así: sin moneda y sin rol de precio, se anotan y se ignoran.
 */
function readPrices(texts: FlyerReading['texts'], observations: string[]): string[] {
  const keys: string[] = [];
  let looseCurrency: string | null = null;
  for (const block of texts) {
    if (!/\d/.test(block.text)) {
      looseCurrency = currency(block.text) ?? looseCurrency;
      continue;
    }
    if (!block.kind.endsWith('_price')) {
      looseCurrency = null;
      continue;
    }
    if (block.kind === 'other_price' && !currency(block.text) && !looseCurrency) {
      observations.push(`número sin moneda, no se cuenta como precio: "${block.text}"`);
      continue;
    }
    const read = readPrice(block.text);
    const price = read && { ...read, currency: read.currency ?? looseCurrency };
    looseCurrency = null;
    if (!price) observations.push(`precio ilegible o con varios importes: "${block.text}"`);
    keys.push(price ? priceKey(price) : `ilegible:${block.text}`);
  }
  return keys;
}

/**
 * Compara la lectura del flyer FINAL, con el logo ya pegado, contra los textos del brief: si el
 * logo tapó un texto, ese texto falla aquí. Exige precios y fechas exactos, sin precios ni
 * fechas de más, todos los textos pedidos y la esquina del logo sin texto de la IA.
 */
export function verifyFlyer(
  brief: FlyerBrief,
  reading: FlyerReading,
  review: LogoAreaReview | null,
): FlyerVerification {
  const read = Array.isArray(reading?.texts) ? reading.texts : [];
  const ofFlyer = read.filter((text) => text.kind !== 'product_text' && text.kind !== 'logo');
  // Los textos se buscan en todo menos el logo: la lectura a veces clasifica el nombre del
  // producto como texto impreso en el producto.
  const everything = compact(
    read
      .filter((text) => text.kind !== 'logo')
      .map((text) => text.text)
      .join(' '),
  );
  const observations: string[] = [];

  const expectedPrices = brief.texts
    .filter((text) => PRICE_ROLES.has(text.role))
    .map((text) => readPrice(text.text))
    .filter((price): price is ReadPrice => price !== null)
    .map(priceKey);
  const readPricesKeys = readPrices(ofFlyer, observations);
  const prices = sameSet(readPricesKeys, expectedPrices);
  if (!prices)
    observations.push(
      `precios leídos [${readPricesKeys.join(', ')}], esperados [${expectedPrices.join(', ')}]`,
    );

  const expectedDates = brief.texts
    .filter((text) => text.role === 'validity')
    .flatMap((text) => readDates(text.text))
    .map(dateKey);
  const readDatesKeys = ofFlyer
    .filter((text) => ['validity', 'other', 'headline'].includes(text.kind))
    .flatMap((text) => readDates(text.text))
    .map(dateKey);
  const dates = sameSet(readDatesKeys, expectedDates);
  if (!dates)
    observations.push(
      `fechas leídas [${readDatesKeys.join(', ')}], esperadas [${expectedDates.join(', ')}]`,
    );

  const missing = brief.texts.filter(
    (text) =>
      !PRICE_ROLES.has(text.role) &&
      text.role !== 'validity' &&
      !everything.includes(compact(text.text)),
  );
  for (const text of missing)
    observations.push(`${text.role} distinto o ausente: se esperaba "${text.text}"`);

  // Un objeto bajo el logo se anota pero no falla: puede ser el borde difuso de la escena.
  const logoCoversText = Boolean(review?.hasText);
  if (logoCoversText) observations.push(`el logo tapa texto de la IA: "${review!.text}"`);
  if (review?.hasObject) observations.push(`bajo el logo había: ${review.object}`);

  return {
    ok: prices && dates && missing.length === 0 && !logoCoversText,
    prices,
    dates,
    texts: missing.length === 0,
    logoCoversText,
    observations,
  };
}
