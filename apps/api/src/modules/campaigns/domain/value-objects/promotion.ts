import { timestamp } from '#app/domain/timestamp';
import { Money } from '#app/domain/value-objects/money';
import { InvalidPromotionError, PromotionExpiredError } from '../errors/campaign.errors.js';

export const CONDITIONS_MAX_LENGTH = 120;

// Lo que acompaña al precio: condiciones que se imprimen tal cual y si el flyer muestra el
// porcentaje de descuento, que calcula el sistema.
export interface PromotionTerms {
  conditions?: string | null;
  showDiscount?: boolean;
}

function conditions(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || value.trim().length > CONDITIONS_MAX_LENGTH)
    throw new InvalidPromotionError('conditions');
  return value.trim() || null;
}

export class Promotion {
  private constructor(
    readonly price: Money,
    private readonly start: number | null,
    private readonly end: number | null,
    readonly conditions: string | null,
    readonly showDiscount: boolean,
  ) {
    Object.freeze(this);
  }

  static create(
    regularPrice: Money,
    price: Money,
    startsAt: Date | null = null,
    endsAt: Date | null = null,
    terms: PromotionTerms = {},
  ): Promotion {
    const promotion = Promotion.restore(price, startsAt, endsAt, terms);
    promotion.assertCompatibleWith(regularPrice);
    return promotion;
  }

  /** Restaura los valores propios sin consultar el precio actual del catálogo ni el reloj. */
  static restore(
    price: Money,
    startsAt: Date | null,
    endsAt: Date | null,
    terms: PromotionTerms = {},
  ): Promotion {
    if (!(price instanceof Money)) throw new InvalidPromotionError('price');
    const start = startsAt === null ? null : timestamp(startsAt);
    const end = endsAt === null ? null : timestamp(endsAt);
    if (start !== null && end !== null && end <= start) throw new InvalidPromotionError('period');
    const showDiscount = terms.showDiscount ?? false;
    if (typeof showDiscount !== 'boolean') throw new InvalidPromotionError('showDiscount');
    return new Promotion(price, start, end, conditions(terms.conditions), showDiscount);
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
      conditions: this.conditions,
      showDiscount: this.showDiscount,
    });
  }
}
