import {
  Money,
  Currency,
  CurrencyMismatchError,
  InvalidMoneyAmountError,
  UnsupportedCurrencyError,
} from './money.js';

describe('Money', () => {
  it.each(Object.values(Currency))('requires explicit supported currency %s', (currency) => {
    const money = Money.fromMinorUnits(1990, currency);
    expect(money.amountMinor).toBe(1990);
    expect(money.currency).toBe(currency);
    expect(money.fractionDigits).toBe(2);
  });

  it.each([0, Number.MAX_SAFE_INTEGER])('accepts the valid boundary %s', (amount) => {
    expect(Money.fromMinorUnits(amount, Currency.PEN).amountMinor).toBe(amount);
  });

  it.each([-1, 19.9, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid minor-unit amount %s',
    (amount) => {
      expect(() => Money.fromMinorUnits(amount, Currency.PEN)).toThrow(InvalidMoneyAmountError);
    },
  );

  it.each(['', 'pen', 'BTC', 'JPY', 'toString'])('rejects unsupported currency %j', (currency) => {
    expect(() => Money.fromMinorUnits(100, currency)).toThrow(UnsupportedCurrencyError);
  });

  it('compares amounts without floating-point conversion', () => {
    const regular = Money.fromMinorUnits(1990, Currency.PEN);
    const promotion = Money.fromMinorUnits(1490, Currency.PEN);
    expect(promotion.compareTo(regular)).toBe(-1);
    expect(regular.compareTo(promotion)).toBe(1);
    expect(regular.compareTo(Money.fromMinorUnits(1990, Currency.PEN))).toBe(0);
    expect(regular.equals(Money.fromMinorUnits(1990, Currency.PEN))).toBe(true);
  });

  it('does not compare or silently convert different currencies', () => {
    const soles = Money.fromMinorUnits(100, Currency.PEN);
    const dollars = Money.fromMinorUnits(100, Currency.USD);
    expect(soles.equals(dollars)).toBe(false);
    expect(() => soles.compareTo(dollars)).toThrow(CurrencyMismatchError);
  });

  it('cannot be mutated after validation', () => {
    const money = Money.fromMinorUnits(100, Currency.PEN);
    expect(() => Object.assign(money, { amountMinor: -1 })).toThrow(TypeError);
    expect(money.amountMinor).toBe(100);
  });
});
