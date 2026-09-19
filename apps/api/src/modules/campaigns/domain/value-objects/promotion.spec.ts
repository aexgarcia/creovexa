import { Money, Currency } from '#app/domain/value-objects/money';
import { InvalidTimestampError } from '#app/domain/timestamp';
import { InvalidPromotionError, PromotionExpiredError } from '../errors/campaign.errors.js';
import { Promotion } from './promotion.js';

const regular = Money.fromMinorUnits(2000, Currency.PEN);
const discounted = Money.fromMinorUnits(1500, Currency.PEN);

describe('Promotion', () => {
  it('accepts a discount without dates and preserves minor units', () => {
    const promotion = Promotion.create(regular, discounted);
    expect(promotion.toSnapshot()).toEqual({
      amountMinor: 1500,
      currency: Currency.PEN,
      startsAt: null,
      endsAt: null,
    });
    promotion.assertNotExpired(new Date('2030-01-01'));
  });

  it.each([2000, 2100])('rejects a price that is not below the regular price: %s', (amount) => {
    expect(() => Promotion.create(regular, Money.fromMinorUnits(amount, Currency.PEN))).toThrow(
      InvalidPromotionError,
    );
  });

  it('rejects a different currency', () => {
    expect(() => Promotion.create(regular, Money.fromMinorUnits(1000, Currency.USD))).toThrow(
      InvalidPromotionError,
    );
  });

  it.each(['2026-09-18', '2026-09-17'])('requires an end after the start: %s', (end) => {
    expect(() =>
      Promotion.create(regular, discounted, new Date('2026-09-18'), new Date(end)),
    ).toThrow(InvalidPromotionError);
  });

  it('allows preparing a future offer but expires exactly at its end', () => {
    const promotion = Promotion.create(
      regular,
      discounted,
      new Date('2026-09-19'),
      new Date('2026-09-20'),
    );
    promotion.assertNotExpired(new Date('2026-09-18'));
    expect(() => promotion.assertNotExpired(new Date('2026-09-20'))).toThrow(PromotionExpiredError);
  });

  it('copies dates and rejects invalid timestamps', () => {
    const start = new Date('2026-09-18');
    const end = new Date('2026-09-20');
    const promotion = Promotion.create(regular, discounted, start, end);
    start.setUTCFullYear(2000);
    end.setUTCFullYear(2000);
    promotion.startsAt!.setUTCFullYear(2000);
    promotion.endsAt!.setUTCFullYear(2000);
    expect(promotion.startsAt!.toISOString()).toBe('2026-09-18T00:00:00.000Z');
    expect(promotion.endsAt!.toISOString()).toBe('2026-09-20T00:00:00.000Z');
    expect(() => Promotion.create(regular, discounted, new Date(NaN))).toThrow(
      InvalidTimestampError,
    );
    expect(() => Promotion.create(regular, discounted).assertNotExpired(new Date(NaN))).toThrow(
      InvalidTimestampError,
    );
  });

  it('rechecks a discount against a changed regular price', () => {
    const promotion = Promotion.create(regular, discounted);
    expect(() => promotion.assertCompatibleWith(Money.fromMinorUnits(1400, Currency.PEN))).toThrow(
      InvalidPromotionError,
    );
  });
});
