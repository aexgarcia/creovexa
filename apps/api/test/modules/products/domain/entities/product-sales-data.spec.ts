import { Product } from '#app/modules/products/domain/entities/product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { Money } from '#app/domain/value-objects/money';

const id = '11111111-1111-4111-8111-111111111111';
const org = '22222222-2222-4222-8222-222222222222';
const at = new Date('2026-09-17T12:00:00Z');
const later = new Date('2026-09-17T13:00:00Z');
const base = { name: 'Monitor TEROS 23.8"', regularPrice: Money.fromMinorUnits(49900, 'PEN') };

const create = (input: object = {}) =>
  Product.create(id, org, ProductKind.PRODUCT, { ...base, ...input }, at);

// Datos de venta para el copy (ADR-0029).
describe('Product sales data', () => {
  it('starts without benefits nor ideal buyer', () => {
    const product = create();
    expect(product.benefits).toEqual([]);
    expect(product.idealFor).toBeNull();
  });

  it('normalizes the benefits and the ideal buyer', () => {
    const product = create({
      benefits: [' Reaccionas antes en shooters ', 'Colores fieles desde cualquier ángulo'],
      idealFor: '  Gamers que quieren pasar a 144 Hz  ',
    });
    expect(product.benefits).toEqual([
      'Reaccionas antes en shooters',
      'Colores fieles desde cualquier ángulo',
    ]);
    expect(Object.isFrozen(product.benefits)).toBe(true);
    expect(product.idealFor).toBe('Gamers que quieren pasar a 144 Hz');
    expect(create({ idealFor: '   ' }).idealFor).toBeNull();
  });

  it.each([
    [{ benefits: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'benefits'],
    [{ benefits: ['Rápido', 'rápido'] }, 'benefits'],
    [{ benefits: [' '] }, 'benefits'],
    [{ benefits: ['x'.repeat(121)] }, 'benefits'],
    [{ benefits: 'Rápido' }, 'benefits'],
    [{ idealFor: 'x'.repeat(201) }, 'idealFor'],
    [{ idealFor: 3 }, 'idealFor'],
  ])('rejects invalid sales data %j', (input, field) => {
    expect(() => create(input)).toThrow(expect.objectContaining({ field }) as Error);
  });

  it('keeps omitted sales data and clears it with [] and null', () => {
    const product = create({ benefits: ['Uno'], idealFor: 'Gamers' });
    const kept = product.updateDetails({ name: 'Otro nombre' }, later);
    expect([kept.benefits, kept.idealFor]).toEqual([['Uno'], 'Gamers']);
    const cleared = product.updateDetails({ benefits: [], idealFor: null }, later);
    expect([cleared.benefits, cleared.idealFor]).toEqual([[], null]);
  });
});
