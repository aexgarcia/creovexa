import { Product } from '../../domain/entities/product.js';
import { ProductKind } from '../../domain/product-kind.js';
import { ProductNotFoundError } from '../../domain/errors/product.errors.js';
import { Money } from '#app/domain/value-objects/money';
import { GetProduct } from './get-product.js';
import { ListProducts } from './list-products.js';
import {
  ProductRepositoryFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  PRODUCT_ID,
  creationClock,
} from '../../../../../test/support/commercial-fakes.js';

describe('Read products', () => {
  it('returns application data and hides resources outside the selected organization', async () => {
    const repository = new ProductRepositoryFake();
    repository.records.set(
      PRODUCT_ID,
      Product.create(
        PRODUCT_ID,
        ORGANIZATION_ID,
        ProductKind.PRODUCT,
        { name: 'Producto', regularPrice: Money.fromMinorUnits(100, 'PEN') },
        creationClock.now(),
      ),
    );
    const get = new GetProduct(repository);
    expect(
      await get.execute({ organizationId: ORGANIZATION_ID, productId: PRODUCT_ID }),
    ).toMatchObject({ id: PRODUCT_ID, regularPrice: { amountMinor: 100 } });
    await expect(
      get.execute({ organizationId: OTHER_ORGANIZATION_ID, productId: PRODUCT_ID }),
    ).rejects.toThrow(ProductNotFoundError);
    expect(
      await new ListProducts(repository).execute({ organizationId: OTHER_ORGANIZATION_ID }),
    ).toEqual({ items: [], total: 0, page: 1, limit: 20 });
  });
  it('returns empty pages beyond the available items without losing the total', async () => {
    const repository = new ProductRepositoryFake();
    repository.records.set(
      PRODUCT_ID,
      Product.create(
        PRODUCT_ID,
        ORGANIZATION_ID,
        ProductKind.SERVICE,
        { name: 'Servicio', regularPrice: Money.fromMinorUnits(0, 'PEN') },
        creationClock.now(),
      ),
    );
    expect(
      await new ListProducts(repository).execute({
        organizationId: ORGANIZATION_ID,
        page: 2,
        limit: 1,
      }),
    ).toEqual({ items: [], total: 1, page: 2, limit: 1 });
  });
});
