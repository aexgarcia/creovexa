import { Product } from '#app/modules/products/domain/entities/product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { PhotoType } from '#app/modules/products/domain/photo-type';
import { Money } from '#app/domain/value-objects/money';

const id = '11111111-1111-4111-8111-111111111111';
const org = '22222222-2222-4222-8222-222222222222';
const image = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherImage = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const at = new Date('2026-09-17T12:00:00Z');
const later = new Date('2026-09-17T13:00:00Z');
const price = Money.fromMinorUnits(8990, 'PEN');
const base = { name: 'Pack café de altura BAO Café 3 × 500 g', regularPrice: price };

const create = (input: object = {}) =>
  Product.create(id, org, ProductKind.PRODUCT, { ...base, ...input }, at);

describe('Product flyer data', () => {
  it('uses the short name on the flyer and falls back to the full name', () => {
    expect(create().flyerName).toBe(base.name);
    expect(create({ shortName: ' Pack BAO Café 3 × 500 g ' }).flyerName).toBe(
      'Pack BAO Café 3 × 500 g',
    );
  });

  it('normalizes the brand, unit and key attributes', () => {
    const product = create({
      productBrand: ' BAO Café ',
      unit: ' por pack ',
      keyAttributes: [' 100 % arábica ', 'Café de altura'],
    });
    expect(product.productBrand).toBe('BAO Café');
    expect(product.unit).toBe('por pack');
    expect(product.keyAttributes).toEqual(['100 % arábica', 'Café de altura']);
    expect(Object.isFrozen(product.keyAttributes)).toBe(true);
  });

  it.each([
    [{ shortName: 'x'.repeat(41) }, 'shortName'],
    [{ productBrand: 'x'.repeat(81) }, 'productBrand'],
    [{ unit: 'x'.repeat(31) }, 'unit'],
    [{ keyAttributes: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'keyAttributes'],
    [{ keyAttributes: ['Arábica', 'arábica'] }, 'keyAttributes'],
    [{ keyAttributes: ['  '] }, 'keyAttributes'],
    [{ keyAttributes: ['x'.repeat(61)] }, 'keyAttributes'],
  ])('rejects invalid flyer data %j', (input, field) => {
    expect(() => create(input)).toThrow(expect.objectContaining({ field }) as Error);
  });

  it('keeps omitted fields and clears them with null', () => {
    const product = create({ shortName: 'Corto', unit: 'c/u', keyAttributes: ['Uno'] });
    const kept = product.updateDetails({ name: 'Otro nombre' }, later);
    expect([kept.shortName, kept.unit, kept.keyAttributes]).toEqual(['Corto', 'c/u', ['Uno']]);
    const cleared = product.updateDetails(
      { shortName: null, unit: null, keyAttributes: [] },
      later,
    );
    expect([cleared.shortName, cleared.unit, cleared.keyAttributes]).toEqual([null, null, []]);
  });

  it('keeps the image traits only while the image stays the same', () => {
    const traits = { photoType: PhotoType.CUTOUT, hasTransparency: true };
    const product = Product.restore(
      id,
      org,
      ProductKind.PRODUCT,
      { ...base, imageAssetIds: [image] },
      at,
      at,
      traits,
    );
    expect(product.imageTraits).toEqual(traits);
    expect(product.updateDetails({ name: 'Otro' }, later).imageTraits).toEqual(traits);
    expect(product.updateDetails({ imageAssetIds: [otherImage] }, later).imageTraits).toBeNull();
    expect(product.updateDetails({ imageAssetIds: [] }, later).imageTraits).toBeNull();
  });

  it('rejects an unknown stored photo type', () => {
    expect(() =>
      Product.restore(id, org, ProductKind.PRODUCT, { ...base, imageAssetIds: [image] }, at, at, {
        photoType: 'ESTUDIO' as PhotoType,
        hasTransparency: false,
      }),
    ).toThrow(expect.objectContaining({ field: 'photoType' }) as Error);
  });
});
