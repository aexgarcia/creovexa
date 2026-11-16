import { normalizeSuggestion } from '#app/modules/products/application/sales-suggestion-policy';
import { ProductSuggestionError } from '#app/modules/products/application/errors/product-suggestion.error';

describe('normalizeSuggestion', () => {
  it('trims, removes repeated or too long benefits and keeps at most five', () => {
    expect(
      normalizeSuggestion({
        benefits: [
          '  Despiertas  sin acidez ',
          'despiertas sin acidez',
          'x'.repeat(121),
          '',
          7,
          'Uno',
          'Dos',
          'Tres',
          'Cuatro',
          'Cinco',
        ],
        idealFor: '  Quien toma café   cada mañana ',
      }),
    ).toEqual({
      benefits: ['Despiertas sin acidez', 'Uno', 'Dos', 'Tres', 'Cuatro'],
      idealFor: 'Quien toma café cada mañana',
    });
  });
  it('drops an empty or too long ideal buyer', () => {
    expect(normalizeSuggestion({ benefits: ['Uno'], idealFor: ' ' }).idealFor).toBeNull();
    expect(
      normalizeSuggestion({ benefits: ['Uno'], idealFor: 'x'.repeat(201) }).idealFor,
    ).toBeNull();
    expect(normalizeSuggestion({ benefits: ['Uno'] }).idealFor).toBeNull();
  });
  it.each([null, [], 'texto', { benefits: 'Uno' }, { benefits: [] }, { benefits: ['  ', 3] }])(
    'rejects an output without usable benefits: %j',
    (value) => {
      expect(() => normalizeSuggestion(value)).toThrow(ProductSuggestionError);
    },
  );
});
