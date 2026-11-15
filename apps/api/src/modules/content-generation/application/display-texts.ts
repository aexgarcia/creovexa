import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';

// Textos que la IA recibe ya escritos tal como deben verse: la IA no formatea precios ni
// convierte fechas. Los usan el copy, el render y el flyer, para que todos digan lo mismo.

const CURRENCY_SYMBOLS: Record<string, string> = { PEN: 'S/', USD: 'US$', EUR: '€' };

type Price = { amountMinor: number; currency: string };
type Region = GenerationSnapshotData['organization']['region'];
type PromotionSnapshot = NonNullable<GenerationSnapshotData['promotion']>;

// "S/ 1,299.00". Se arma con enteros para no depender de redondeos ni del locale del servidor.
export function formatPrice(price: Price): string {
  const minor = BigInt(price.amountMinor);
  const units = (minor / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cents = (minor % 100n).toString().padStart(2, '0');
  return `${CURRENCY_SYMBOLS[price.currency] ?? price.currency} ${units}.${cents}`;
}

// Los textos del flyer están en español; con una región de otro idioma se usa el español genérico.
function dateLocale(region: Region): string {
  return region.locale.toLowerCase().startsWith('es') ? region.locale : 'es';
}

// "31 de diciembre", en la zona horaria del negocio: un fin a las 23:59 de Lima no pasa al día siguiente.
export function formatDate(iso: string, region: Region): string {
  return new Intl.DateTimeFormat(dateLocale(region), {
    day: 'numeric',
    month: 'long',
    timeZone: region.timeZone,
  }).format(new Date(iso));
}

export function formatValidity(promotion: PromotionSnapshot | null, region: Region): string | null {
  if (!promotion) return null;
  const { startsAt, endsAt } = promotion;
  if (startsAt && endsAt)
    return `Del ${formatDate(startsAt, region)} al ${formatDate(endsAt, region)}`;
  if (endsAt) return `Hasta el ${formatDate(endsAt, region)}`;
  if (startsAt) return `Desde el ${formatDate(startsAt, region)}`;
  return null;
}

// Hacia abajo: anunciar más descuento del real sería publicidad engañosa.
export function formatDiscount(regular: Price, promotion: Price): string {
  return `-${Math.floor((1 - promotion.amountMinor / regular.amountMinor) * 100)} %`;
}
