import { Product } from '../../../domain/entities/product.js';
import { ProductKind } from '../../../domain/product-kind.js';
import { ProductMapper } from './product.mapper.js';
import { Money, Currency, InvalidMoneyAmountError } from '#app/domain/value-objects/money';
import { InvalidTimestampError } from '#app/domain/timestamp';
import {
  ORGANIZATION_ID,
  PRODUCT_ID,
  CREATED_AT,
  UPDATED_AT,
  ASSET_ID,
} from '../../../../../../test/support/commercial-fakes.js';

describe('ProductMapper', () => {
  it.each(Object.values(ProductKind))(
    'restores %s including large minor-unit amounts, dates and copied asset references',
    (kind) => {
      const product = Product.create(
        PRODUCT_ID,
        ORGANIZATION_ID,
        kind,
        {
          name: 'Producto',
          regularPrice: Money.fromMinorUnits(Number.MAX_SAFE_INTEGER, Currency.PEN),
          imageAssetIds: [ASSET_ID],
        },
        new Date(CREATED_AT),
      ).updateDetails({ description: 'Actualizado' }, new Date(UPDATED_AT));
      const row = ProductMapper.toPersistence(product);
      expect(row.amountMinor).toBe(BigInt(Number.MAX_SAFE_INTEGER));
      const restored = ProductMapper.toDomain(row);
      expect(ProductMapper.toPersistence(restored)).toEqual(row);
      expect(restored.kind).toBe(kind);
      row.imageAssetIds.length = 0;
      row.updatedAt.setUTCFullYear(2000);
      expect(restored.imageAssetIds).toEqual([ASSET_ID]);
      expect(restored.updatedAt.toISOString()).toBe(UPDATED_AT);
    },
  );

  it('rejects out-of-range database integers and dates instead of silently losing precision', () => {
    const product = Product.create(
      PRODUCT_ID,
      ORGANIZATION_ID,
      ProductKind.PRODUCT,
      { name: 'Producto', regularPrice: Money.fromMinorUnits(100, Currency.USD) },
      new Date(CREATED_AT),
    );
    const row = ProductMapper.toPersistence(product);
    expect(() => ProductMapper.toDomain({ ...row, amountMinor: 9007199254740992n })).toThrow(
      InvalidMoneyAmountError,
    );
    expect(() => ProductMapper.toDomain({ ...row, updatedAt: new Date('2000-01-01') })).toThrow(
      InvalidTimestampError,
    );
  });
});
