import { UpdateProductArchive } from '#app/modules/products/application/use-cases/update-product-archive';
import { ListProducts } from '#app/modules/products/application/use-cases/list-products';
import { ProductNotFoundError } from '#app/modules/products/domain/errors/product.errors';
import {
  ProductRepositoryFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  PRODUCT_ID,
  CREATED_AT,
} from '../../../../support/commercial-fakes.js';
import { Product } from '#app/modules/products/domain/entities/product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { Money } from '#app/domain/value-objects/money';

describe('Archivado de productos', () => {
  const later = new Date('2026-11-15T12:00:00Z');
  it('archiva, filtra y restaura sin cambiar el contenido ni sus fechas', async () => {
    const repository = new ProductRepositoryFake();
    const original = Product.create(
      PRODUCT_ID,
      ORGANIZATION_ID,
      ProductKind.PRODUCT,
      { name: 'Producto', regularPrice: Money.fromMinorUnits(100, 'PEN') },
      new Date(CREATED_AT),
    );
    await repository.add(ORGANIZATION_ID, original);
    const useCase = new UpdateProductArchive(repository, { now: () => later });
    const input = { organizationId: ORGANIZATION_ID, id: original.id, archived: true };
    const archived = await useCase.execute(input);
    expect(archived.archivedAt).toBe(later.toISOString());
    expect(archived.updatedAt).toBe(original.updatedAt.toISOString());

    const list = new ListProducts(repository);
    expect((await list.execute({ organizationId: ORGANIZATION_ID })).total).toBe(0);
    expect(
      (await list.execute({ organizationId: ORGANIZATION_ID, status: 'archived' })).total,
    ).toBe(1);
    expect((await list.execute({ organizationId: ORGANIZATION_ID, status: 'all' })).total).toBe(1);
    const repeated = await new UpdateProductArchive(repository, {
      now: () => new Date(later.getTime() + 1000),
    }).execute(input);
    expect(repeated.archivedAt).toBe(archived.archivedAt);
    expect((await useCase.execute({ ...input, archived: false })).archivedAt).toBeNull();
    expect((await list.execute({ organizationId: ORGANIZATION_ID })).total).toBe(1);
  });
  it('rechaza recursos de otra organización y recursos inexistentes', async () => {
    const repository = new ProductRepositoryFake();
    const original = Product.create(
      PRODUCT_ID,
      ORGANIZATION_ID,
      ProductKind.PRODUCT,
      { name: 'Producto', regularPrice: Money.fromMinorUnits(100, 'PEN') },
      new Date(CREATED_AT),
    );
    await repository.add(ORGANIZATION_ID, original);
    const useCase = new UpdateProductArchive(repository, { now: () => later });
    await expect(
      useCase.execute({ organizationId: OTHER_ORGANIZATION_ID, id: original.id, archived: true }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    expect((await repository.findById(ORGANIZATION_ID, original.id))?.archivedAt).toBeNull();
    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        id: OTHER_ORGANIZATION_ID,
        archived: true,
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
