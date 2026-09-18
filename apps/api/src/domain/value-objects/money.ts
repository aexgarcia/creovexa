export enum Currency {
  PEN = 'PEN',
  USD = 'USD',
  EUR = 'EUR',
}

const minorUnitDigits: Record<Currency, number> = {
  [Currency.PEN]: 2,
  [Currency.USD]: 2,
  [Currency.EUR]: 2,
};

export class InvalidMoneyAmountError extends Error {
  constructor() {
    super('El importe debe ser un entero seguro no negativo en unidades menores.');
    this.name = 'InvalidMoneyAmountError';
  }
}

export class UnsupportedCurrencyError extends Error {
  constructor() {
    super('La moneda no está soportada.');
    this.name = 'UnsupportedCurrencyError';
  }
}

export class CurrencyMismatchError extends Error {
  constructor() {
    super('No se pueden comparar importes de monedas distintas.');
    this.name = 'CurrencyMismatchError';
  }
}

export class Money {
  private constructor(
    readonly amountMinor: number,
    readonly currency: Currency,
  ) {
    Object.freeze(this);
  }

  static fromMinorUnits(amountMinor: number, currency: string): Money {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
      throw new InvalidMoneyAmountError();
    }
    if (!Object.values(Currency).includes(currency as Currency)) {
      throw new UnsupportedCurrencyError();
    }
    return new Money(amountMinor, currency as Currency);
  }

  get fractionDigits(): number {
    return minorUnitDigits[this.currency];
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  compareTo(other: Money): -1 | 0 | 1 {
    if (this.currency !== other.currency) throw new CurrencyMismatchError();
    if (this.amountMinor === other.amountMinor) return 0;
    return this.amountMinor < other.amountMinor ? -1 : 1;
  }
}
