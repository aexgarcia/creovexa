import { readCopyGenerationConfig } from './copy-generation.config.js';
describe('copy provider configuration', () => {
  it('defaults to Gemini without using an OpenAI key', () => {
    const config = readCopyGenerationConfig({ OPENAI_API_KEY: 'unused-key' });
    expect(config).toEqual({
      provider: 'gemini',
      settings: { apiKey: null, model: 'gemini-2.5-flash-lite', timeoutMs: 20000 },
    });
  });
  it('loads only the selected provider configuration', () => {
    expect(
      readCopyGenerationConfig({
        COPY_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'gemini-key',
        OPENAI_COPY_TIMEOUT_MS: 'invalid',
      }).settings.apiKey,
    ).toBe('gemini-key');
    expect(
      readCopyGenerationConfig({
        COPY_PROVIDER: 'openai',
        OPENAI_API_KEY: 'openai-key',
        OPENAI_COPY_MODEL: 'test-model',
        GEMINI_COPY_TIMEOUT_MS: 'invalid',
      }),
    ).toMatchObject({
      provider: 'openai',
      settings: { apiKey: 'openai-key', model: 'test-model' },
    });
  });
  it('rejects unsupported provider', () =>
    expect(() => readCopyGenerationConfig({ COPY_PROVIDER: 'unknown' })).toThrow('COPY_PROVIDER'));
  it.each(['0', '40001', 'NaN', '2.3'])('rejects timeout %s', (value) =>
    expect(() => readCopyGenerationConfig({ GEMINI_COPY_TIMEOUT_MS: value })).toThrow(
      'GEMINI_COPY_TIMEOUT_MS',
    ),
  );
  it.each(['../models/model', 'https://other/model', 'gemini-test?key=x'])(
    'rejects model path %s',
    (model) =>
      expect(() => readCopyGenerationConfig({ GEMINI_COPY_MODEL: model })).toThrow(
        'GEMINI_COPY_MODEL',
      ),
  );
  it('trims selected configuration', () =>
    expect(
      readCopyGenerationConfig({
        COPY_PROVIDER: ' gemini ',
        GEMINI_API_KEY: ' key ',
        GEMINI_COPY_MODEL: ' gemini-test ',
      }),
    ).toMatchObject({ settings: { apiKey: 'key', model: 'gemini-test' } }));
});
