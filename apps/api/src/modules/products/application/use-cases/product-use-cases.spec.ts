import { CreateProduct, type CreateProductInput } from './create-product.js';
import { UpdateProduct } from './update-product.js';
import { ProductOrganizationNotFoundError } from '../errors/product-organization-not-found.error.js';
import { ProductKind } from '../../domain/product-kind.js';
import { Product } from '../../domain/entities/product.js';
import { InvalidProductError, ProductNotFoundError } from '../../domain/errors/product.errors.js';
import {
  Currency,
  Money,
  InvalidMoneyAmountError,
  UnsupportedCurrencyError,
} from '#app/domain/value-objects/money';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import {
  ProductRepositoryFake,
  OrganizationLookupFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  PRODUCT_ID,
  ASSET_ID,
  CREATED_AT,
  UPDATED_AT,
  creationClock,
  updateClock,
} from '../../../../../test/support/commercial-fakes.js';

function input(): CreateProductInput {
  return {
    organizationId: ORGANIZATION_ID,
    name: ' Producto ',
    description: 'Descripción',
    kind: ProductKind.PRODUCT,
    regularPrice: { amountMinor: 1990, currency: Currency.PEN },
    imageAssetIds: [ASSET_ID],
  };
}

function createUseCase(
  repository: ProductRepositoryFake,
  organizations = new OrganizationLookupFake(),
) {
  return new CreateProduct(repository, organizations, { next: () => PRODUCT_ID }, creationClock);
}

describe('Product use cases', () => {
  it.each(Object.values(ProductKind))('creates a %s in an existing organization', async (kind) => {
    const repository = new ProductRepositoryFake();

    const result = await createUseCase(repository).execute({ ...input(), kind });

    expect(result).toEqual({
      id: PRODUCT_ID,
      organizationId: ORGANIZATION_ID,
      kind,
      name: 'Producto',
      description: 'Descripción',
      regularPrice: { amountMinor: 1990, currency: Currency.PEN },
      imageAssetIds: [ASSET_ID],
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(repository.records.get(PRODUCT_ID)).toBeInstanceOf(Product);
    expect(result).not.toBeInstanceOf(Product);
  });

  it('does not create a product for a missing organization', async () => {
    const repository = new ProductRepositoryFake();
    const useCase = createUseCase(repository, new OrganizationLookupFake([]));

    await expect(useCase.execute(input())).rejects.toThrow(ProductOrganizationNotFoundError);
    expect(repository.records.size).toBe(0);
  });

  it.each([
    { regularPrice: { amountMinor: -1, currency: Currency.PEN }, error: InvalidMoneyAmountError },
    { regularPrice: { amountMinor: 10, currency: 'BTC' }, error: UnsupportedCurrencyError },
  ])('rejects invalid prices without writing a product', async ({ regularPrice, error }) => {
    const repository = new ProductRepositoryFake();

    await expect(createUseCase(repository).execute({ ...input(), regularPrice })).rejects.toThrow(
      error,
    );
    expect(repository.records.size).toBe(0);
  });

  it('rejects malformed organization identifiers before storing', async () => {
    const repository = new ProductRepositoryFake();

    await expect(
      createUseCase(repository).execute({ ...input(), organizationId: 'invalid' }),
    ).rejects.toThrow(InvalidEntityIdError);
    expect(repository.records.size).toBe(0);
  });

  it('keeps returned price and image data independent from the domain entity', async () => {
    const repository = new ProductRepositoryFake();
    const result = await createUseCase(repository).execute(input());

    result.regularPrice.amountMinor = -1;
    result.imageAssetIds.push(PRODUCT_ID);

    expect(repository.records.get(PRODUCT_ID)?.regularPrice.amountMinor).toBe(1990);
    expect(repository.records.get(PRODUCT_ID)?.imageAssetIds).toEqual([ASSET_ID]);
  });

  it('updates only supplied commercial fields in the selected organization', async () => {
    const repository = new ProductRepositoryFake();
    await createUseCase(repository).execute(input());
    const useCase = new UpdateProduct(repository, updateClock);

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      productId: PRODUCT_ID,
      name: 'Servicio revisado',
      regularPrice: { amountMinor: 3000, currency: Currency.USD },
    });

    expect(result).toMatchObject({
      id: PRODUCT_ID,
      organizationId: ORGANIZATION_ID,
      kind: ProductKind.PRODUCT,
      name: 'Servicio revisado',
      description: 'Descripción',
      imageAssetIds: [ASSET_ID],
      regularPrice: { amountMinor: 3000, currency: Currency.USD },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });
    expect(repository.saveCount).toBe(1);
  });

  it('rejects updates from another organization without changing the original product', async () => {
    const repository = new ProductRepositoryFake();
    await createUseCase(repository).execute(input());
    const useCase = new UpdateProduct(repository, updateClock);

    await expect(
      useCase.execute({
        organizationId: OTHER_ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Cambio',
      }),
    ).rejects.toThrow(ProductNotFoundError);
    expect(repository.records.get(PRODUCT_ID)?.name).toBe('Producto');
    expect(repository.saveCount).toBe(0);
  });

  it('defends the organization boundary even if a repository returns an incorrect result', async () => {
    const repository = new ProductRepositoryFake();
    const foreignProduct = Product.create(
      PRODUCT_ID,
      OTHER_ORGANIZATION_ID,
      ProductKind.SERVICE,
      {
        name: 'Otro negocio',
        regularPrice: Money.fromMinorUnits(100, Currency.PEN),
      },
      creationClock.now(),
    );
    repository.findById = () => Promise.resolve(foreignProduct);
    const useCase = new UpdateProduct(repository, updateClock);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Cambio',
      }),
    ).rejects.toThrow(ProductNotFoundError);
    expect(repository.saveCount).toBe(0);
  });

  it('rejects a different product returned under the requested identifier', async () => {
    const repository = new ProductRepositoryFake();
    const wrongProduct = Product.create(
      ASSET_ID,
      ORGANIZATION_ID,
      ProductKind.PRODUCT,
      {
        name: 'Otro producto',
        regularPrice: Money.fromMinorUnits(100, Currency.PEN),
      },
      creationClock.now(),
    );
    repository.findById = () => Promise.resolve(wrongProduct);

    await expect(
      new UpdateProduct(repository, updateClock).execute({
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Cambio',
      }),
    ).rejects.toThrow(ProductNotFoundError);
    expect(repository.saveCount).toBe(0);
  });

  it('reports missing products without inserting them', async () => {
    const repository = new ProductRepositoryFake();

    await expect(
      new UpdateProduct(repository, updateClock).execute({
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Cambio',
      }),
    ).rejects.toThrow(ProductNotFoundError);
    expect(repository.records.size).toBe(0);
    expect(repository.saveCount).toBe(0);
  });

  it('leaves the previous price and name intact after an invalid update', async () => {
    const repository = new ProductRepositoryFake();
    await createUseCase(repository).execute(input());
    const useCase = new UpdateProduct(repository, updateClock);

    await expect(
      useCase.execute({
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Cambio',
        regularPrice: { amountMinor: 1.5, currency: Currency.PEN },
      }),
    ).rejects.toThrow(InvalidMoneyAmountError);
    expect(repository.records.get(PRODUCT_ID)?.name).toBe('Producto');
    expect(repository.records.get(PRODUCT_ID)?.regularPrice.amountMinor).toBe(1990);
    expect(repository.saveCount).toBe(0);
  });

  it('validates the full update before saving any changes', async () => {
    const repository = new ProductRepositoryFake();
    await createUseCase(repository).execute(input());

    await expect(
      new UpdateProduct(repository, updateClock).execute({
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: '',
        regularPrice: { amountMinor: 3000, currency: Currency.PEN },
      }),
    ).rejects.toThrow(InvalidProductError);
    expect(repository.records.get(PRODUCT_ID)?.regularPrice.amountMinor).toBe(1990);
    expect(repository.saveCount).toBe(0);
  });

  it('propagates save failure without mutating the previously loaded product', async () => {
    const repository = new ProductRepositoryFake();
    await createUseCase(repository).execute(input());
    const failure = new Error('Storage unavailable');
    repository.save = () => Promise.reject(failure);

    await expect(
      new UpdateProduct(repository, updateClock).execute({
        organizationId: ORGANIZATION_ID,
        productId: PRODUCT_ID,
        name: 'Cambio',
      }),
    ).rejects.toBe(failure);
    expect(repository.records.get(PRODUCT_ID)?.name).toBe('Producto');
  });
});
