import { Currency } from '#app/domain/value-objects/money';
import {
  formatDiscount,
  formatPrice,
  formatValidity,
} from '#app/modules/content-generation/application/display-texts';

const LIMA = { country: 'PE', locale: 'es-PE', timeZone: 'America/Lima', currency: 'PEN' };
const promotion = (startsAt: string | null, endsAt: string | null) => ({
  amountMinor: 7490,
  currency: Currency.PEN,
  startsAt,
  endsAt,
  conditions: null,
  showDiscount: false,
});

describe('formatPrice', () => {
  it.each([
    [{ amountMinor: 8990, currency: 'PEN' }, 'S/ 89.90'],
    [{ amountMinor: 129900, currency: 'PEN' }, 'S/ 1,299.00'],
    [{ amountMinor: 5, currency: 'PEN' }, 'S/ 0.05'],
    [{ amountMinor: 5999, currency: 'USD' }, 'US$ 59.99'],
    [{ amountMinor: 9900, currency: 'EUR' }, '€ 99.00'],
    [{ amountMinor: 100000000, currency: 'CLP' }, 'CLP 1,000,000.00'],
  ])('formats %j as %s', (price, text) => {
    expect(formatPrice(price)).toBe(text);
  });
});

describe('formatValidity', () => {
  it('uses the business time zone instead of UTC', () => {
    // 23:59 del 31 de diciembre en Lima es el 1 de enero en UTC.
    expect(formatValidity(promotion(null, '2027-01-01T04:59:00.000Z'), LIMA)).toBe(
      'Hasta el 31 de diciembre',
    );
  });
  it('covers start, end and both', () => {
    expect(
      formatValidity(promotion('2026-12-01T05:00:00.000Z', '2026-12-16T04:59:00.000Z'), LIMA),
    ).toBe('Del 1 de diciembre al 15 de diciembre');
    expect(formatValidity(promotion('2026-12-01T05:00:00.000Z', null), LIMA)).toBe(
      'Desde el 1 de diciembre',
    );
    expect(formatValidity(promotion(null, null), LIMA)).toBeNull();
    expect(formatValidity(null, LIMA)).toBeNull();
  });
  it('keeps Spanish texts for regions in other languages', () => {
    const region = { ...LIMA, locale: 'en-US', timeZone: 'America/New_York' };
    expect(formatValidity(promotion(null, '2027-01-01T04:59:00.000Z'), region)).toBe(
      'Hasta el 31 de diciembre',
    );
  });
});

describe('formatDiscount', () => {
  it('rounds down so it never announces more than the real discount', () => {
    expect(
      formatDiscount(
        { amountMinor: 8990, currency: 'PEN' },
        { amountMinor: 7490, currency: 'PEN' },
      ),
    ).toBe('-16 %');
  });
});
