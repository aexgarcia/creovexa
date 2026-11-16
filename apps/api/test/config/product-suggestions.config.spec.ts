import { readProductSuggestionsConfig } from '#app/config/product-suggestions.config';

describe('Product suggestions configuration', () => {
  it('is enabled by default and uses the copy provider', () => {
    const config = readProductSuggestionsConfig({
      COPY_PROVIDER: 'openai',
      OPENAI_API_KEY: 'secret',
      OPENAI_COPY_MODEL: 'gpt-6-luna',
      OPENAI_COPY_REASONING_EFFORT: 'low',
    });
    expect(config.enabled).toBe(true);
    expect(config.provider).toMatchObject({
      provider: 'openai',
      settings: { model: 'gpt-6-luna', reasoningEffort: 'low' },
    });
  });
  it.each([
    ['false', false],
    [' true ', true],
    ['', true],
  ])('reads PRODUCT_SUGGESTIONS_ENABLED=%j', (value, enabled) =>
    expect(readProductSuggestionsConfig({ PRODUCT_SUGGESTIONS_ENABLED: value }).enabled).toBe(
      enabled,
    ),
  );
  it.each(['no', '0', 'FALSE'])('rejects PRODUCT_SUGGESTIONS_ENABLED=%s', (value) =>
    expect(() => readProductSuggestionsConfig({ PRODUCT_SUGGESTIONS_ENABLED: value })).toThrow(
      'PRODUCT_SUGGESTIONS_ENABLED',
    ),
  );
});
