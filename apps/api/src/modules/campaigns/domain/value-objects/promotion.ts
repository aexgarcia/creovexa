import { timestamp } from '#app/domain/timestamp';
import { Money } from '#app/domain/value-objects/money';
import { InvalidPromotionError, PromotionExpiredError } from '../errors/campaign.errors.js';

export class Promotion {
  private constructor(
    readonly price: Money,
    private readonly start: number | null,
    private readonly end: number | null,
  ) {
    Object.freeze(this);
  }

  static create(
    regularPrice: Money,
    price: Money,
    startsAt: Date | null = null,
    endsAt: Date | null = null,
  ): Promotion {
    const promotion = Promotion.restore(price, startsAt, endsAt);
    promotion.assertCompatibleWith(regularPrice);
    return promotion;
  }

  /** Restore intrinsic values without consulting today's catalog price or clock. */
  static restore(price: Money, startsAt: Date | null, endsAt: Date | null): Promotion {
    if (!(price instanceof Money)) throw new InvalidPromotionError('price');
    const start = startsAt === null ? null : timestamp(startsAt);
    const end = endsAt === null ? null : timestamp(endsAt);
    if (start !== null && end !== null && end <= start) throw new InvalidPromotionError('period');
    return new Promotion(price, start, end);
  }

  assertCompatibleWith(regularPrice: Money): void {
    if (!(this.price instanceof Money) || !(regularPrice instanceof Money)) {
      throw new InvalidPromotionError('price');
    }
    if (this.price.currency !== regularPrice.currency) throw new InvalidPromotionError('currency');
    if (this.price.compareTo(regularPrice) >= 0) throw new InvalidPromotionError('price');
  }

  assertNotExpired(at: Date): void {
    const now = timestamp(at);
    if (this.end !== null && now >= this.end) throw new PromotionExpiredError();
  }

  get startsAt(): Date | null {
    return this.start === null ? null : new Date(this.start);
  }
  get endsAt(): Date | null {
    return this.end === null ? null : new Date(this.end);
  }

  toSnapshot() {
    return Object.freeze({
      amountMinor: this.price.amountMinor,
      currency: this.price.currency,
      startsAt: this.startsAt?.toISOString() ?? null,
      endsAt: this.endsAt?.toISOString() ?? null,
    });
  }
}
