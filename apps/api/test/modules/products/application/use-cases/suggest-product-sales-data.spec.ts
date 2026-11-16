import { SuggestProductSalesData } from '#app/modules/products/application/use-cases/suggest-product-sales-data';
import type { ProductSalesAdvisor } from '#app/modules/products/application/ports/product-sales-advisor';
import { ProductOrganizationNotFoundError } from '#app/modules/products/application/errors/product-organization-not-found.error';
import { InvalidProductError } from '#app/modules/products/domain/errors/product.errors';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { ORGANIZATION_ID, OrganizationLookupFake } from '../../../../support/commercial-fakes.js';

const OTHER_ORGANIZATION = '99999999-9999-4999-8999-999999999999';

function advisor(available = true, answer: unknown = { benefits: [' Uno '], idealFor: 'Gamers' }) {
  return {
    available: vi.fn(() => available),
    suggest: vi.fn<ProductSalesAdvisor['suggest']>().mockResolvedValue(answer),
  };
}
const input = {
  organizationId: ORGANIZATION_ID,
  kind: ProductKind.PRODUCT,
  name: ' Café de altura ',
  description: '  ',
  productBrand: null,
  keyAttributes: [' 100 % arábica ', ''],
  unit: 'por kg',
};

describe('SuggestProductSalesData', () => {
  it('sends the form and the brand context, and normalizes the answer', async () => {
    const ai = advisor();
    const result = await new SuggestProductSalesData(new OrganizationLookupFake(), ai).execute(
      input,
    );
    expect(result).toEqual({ benefits: ['Uno'], idealFor: 'Gamers' });
    expect(ai.suggest).toHaveBeenCalledWith({
      region: { country: 'PE', locale: 'es-PE' },
      business: {
        name: 'Café Andino',
        description: 'Cafetería de especialidad',
        industry: 'Cafetería',
        brandTone: 'Cercano',
        audience: 'Oficinistas de Lima',
      },
      product: {
        kind: 'PRODUCT',
        name: 'Café de altura',
        productBrand: null,
        description: null,
        keyAttributes: ['100 % arábica'],
        unit: 'por kg',
      },
    });
  });
  it('does not call the provider when suggestions are disabled', async () => {
    const ai = advisor(false);
    const useCase = new SuggestProductSalesData(new OrganizationLookupFake(), ai);
    expect(useCase.available()).toBe(false);
    await expect(useCase.execute(input)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(ai.suggest).not.toHaveBeenCalled();
  });
  it('rejects an empty name and a missing organization before calling the provider', async () => {
    const ai = advisor();
    const useCase = new SuggestProductSalesData(new OrganizationLookupFake(), ai);
    await expect(useCase.execute({ ...input, name: '  ' })).rejects.toBeInstanceOf(
      InvalidProductError,
    );
    await expect(
      useCase.execute({ ...input, organizationId: OTHER_ORGANIZATION }),
    ).rejects.toBeInstanceOf(ProductOrganizationNotFoundError);
    expect(ai.suggest).not.toHaveBeenCalled();
  });
  it('fails when the provider returns no usable benefit', async () => {
    const useCase = new SuggestProductSalesData(
      new OrganizationLookupFake(),
      advisor(true, { benefits: [], idealFor: '' }),
    );
    await expect(useCase.execute(input)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });
});
