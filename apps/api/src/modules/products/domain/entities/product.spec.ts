import { Product } from './product.js';
import { ProductKind } from '../product-kind.js';
import { InvalidProductError } from '../errors/product.errors.js';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import { InvalidTimestampError } from '#app/domain/timestamp';
import { Money, Currency } from '#app/domain/value-objects/money';

const id = '33333333-3333-4333-8333-333333333333';
const organizationId = '11111111-1111-4111-8111-111111111111';
const imageId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const created = new Date('2026-09-17T12:00:00Z');
const updated = new Date('2026-09-17T13:00:00Z');
const regularPrice = Money.fromMinorUnits(1990, Currency.PEN);

function createProduct() {
  return Product.create(
    id,
    organizationId,
    ProductKind.PRODUCT,
    {
      name: ' Producto ',
      description: ' Descripción ',
      regularPrice,
      imageAssetIds: [imageId],
    },
    created,
  );
}

describe('Product', () => {
  it.each(Object.values(ProductKind))('represents a catalogue item of kind %s', (kind) => {
    const product = Product.create(
      id,
      organizationId,
      kind,
      { name: 'Oferta', regularPrice },
      created,
    );
    expect(product.kind).toBe(kind);
    expect(product.organizationId).toBe(organizationId);
    expect(product.imageAssetIds).toEqual([]);
  });

  it('changes commercial details while preserving identity, owner and kind', () => {
    const original = createProduct();
    const newPrice = Money.fromMinorUnits(2500, Currency.USD);

    const result = original.updateDetails({ name: ' Nuevo ', regularPrice: newPrice }, updated);

    expect(result.id).toBe(id);
    expect(result.organizationId).toBe(organizationId);
    expect(result.kind).toBe(ProductKind.PRODUCT);
    expect(result.name).toBe('Nuevo');
    expect(result.description).toBe('Descripción');
    expect(result.imageAssetIds).toEqual([imageId]);
    expect(result.regularPrice.equals(newPrice)).toBe(true);
    expect(result.createdAt).toEqual(created);
    expect(result.updatedAt).toEqual(updated);
    expect(original.name).toBe('Producto');
    expect(original.regularPrice.amountMinor).toBe(1990);
  });

  it('can clear description and images explicitly', () => {
    const result = createProduct().updateDetails({ description: '', imageAssetIds: [] }, updated);
    expect(result.description).toBe('');
    expect(result.imageAssetIds).toEqual([]);
  });

  it('rejects duplicate asset identities even with different casing', () => {
    expect(() =>
      createProduct().updateDetails(
        {
          imageAssetIds: [imageId, imageId.toUpperCase()],
        },
        updated,
      ),
    ).toThrow(InvalidProductError);
  });

  it('defensively copies and protects image references', () => {
    const images = [imageId];
    const product = Product.create(
      id,
      organizationId,
      ProductKind.PRODUCT,
      {
        name: 'Producto',
        regularPrice,
        imageAssetIds: images,
      },
      created,
    );
    images.push(id);
    expect(product.imageAssetIds).toEqual([imageId]);
    expect(() => Object.defineProperty(product.imageAssetIds, '1', { value: id })).toThrow(
      TypeError,
    );
  });

  it('keeps the previous value when any updated field is invalid', () => {
    const product = createProduct();
    expect(() =>
      product.updateDetails({ name: 'Nuevo', imageAssetIds: ['invalid'] }, updated),
    ).toThrow(InvalidEntityIdError);
    expect(product.name).toBe('Producto');
    expect(product.updatedAt).toEqual(created);
  });

  it('rejects blank names, unknown kinds and unvalidated money', () => {
    expect(() => createProduct().updateDetails({ name: '  ' }, updated)).toThrow(
      InvalidProductError,
    );
    expect(() =>
      Product.create(
        id,
        organizationId,
        'OTHER' as ProductKind,
        {
          name: 'Producto',
          regularPrice,
        },
        created,
      ),
    ).toThrow(InvalidProductError);
    expect(() =>
      createProduct().updateDetails(
        {
          regularPrice: { amountMinor: -1, currency: Currency.PEN } as Money,
        },
        updated,
      ),
    ).toThrow(InvalidProductError);
  });

  it('rejects invalid ownership and backwards timestamps', () => {
    expect(() =>
      Product.create(
        id,
        'invalid',
        ProductKind.PRODUCT,
        {
          name: 'Producto',
          regularPrice,
        },
        created,
      ),
    ).toThrow(InvalidEntityIdError);
    expect(() => createProduct().updateDetails({}, new Date('2026-09-16T00:00:00Z'))).toThrow(
      InvalidTimestampError,
    );
  });

  it('does not expose mutable dates', () => {
    const product = createProduct();
    product.createdAt.setFullYear(2000);
    product.updatedAt.setFullYear(2001);
    expect(product.createdAt).toEqual(created);
    expect(product.updatedAt).toEqual(created);
  });
});
