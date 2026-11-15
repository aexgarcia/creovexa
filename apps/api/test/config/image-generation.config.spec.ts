import { readImageGenerationConfig } from '#app/config/image-generation.config';

describe('Image generation configuration', () => {
  it('loads OpenAI independently, using only the OpenAI key', () => {
    expect(
      readImageGenerationConfig({
        IMAGE_PROVIDER: 'openai',
        OPENAI_API_KEY: ' key ',
        GEMINI_API_KEY: 'ignored',
      }),
    ).toEqual({
      provider: 'openai',
      mode: 'AI_FULL',
      settings: { apiKey: 'key', model: 'gpt-image-2', quality: 'medium', timeoutMs: 120000 },
      vision: { model: 'gpt-5-mini', timeoutMs: 60000 },
    });
    expect(readImageGenerationConfig({ IMAGE_PROVIDER: 'openai' })).toMatchObject({
      settings: { apiKey: null },
    });
    expect(readImageGenerationConfig({ OPENAI_API_KEY: 'key' })).toEqual({
      provider: 'disabled',
      mode: 'COMPOSED',
    });
  });
  it.each([
    { OPENAI_IMAGE_MODEL: 'gpt-5-mini' },
    { OPENAI_IMAGE_MODEL: 'https://evil/image' },
    { OPENAI_IMAGE_QUALITY: 'auto' },
    { OPENAI_IMAGE_TIMEOUT_MS: '120001' },
    { OPENAI_IMAGE_TIMEOUT_MS: 'NaN' },
  ])('rejects invalid OpenAI configuration %j', (settings) => {
    expect(() => readImageGenerationConfig({ IMAGE_PROVIDER: 'openai', ...settings })).toThrow();
  });
  it('uses AI_FULL with OpenAI and lets the deployment choose COMPOSED', () => {
    expect(readImageGenerationConfig({ IMAGE_PROVIDER: 'openai' })).toMatchObject({
      mode: 'AI_FULL',
    });
    expect(
      readImageGenerationConfig({
        IMAGE_PROVIDER: 'openai',
        IMAGE_MODE: ' COMPOSED ',
        OPENAI_VISION_MODEL: 'gpt-5',
        OPENAI_VISION_TIMEOUT_MS: '30000',
      }),
    ).toMatchObject({ mode: 'COMPOSED', vision: { model: 'gpt-5', timeoutMs: 30000 } });
  });
  it.each([
    { IMAGE_PROVIDER: 'openai', IMAGE_MODE: 'HYBRID' },
    { IMAGE_PROVIDER: 'openai', OPENAI_VISION_TIMEOUT_MS: '90001' },
    { IMAGE_PROVIDER: 'openai', OPENAI_VISION_MODEL: 'bad/model' },
    { IMAGE_PROVIDER: 'gemini', GEMINI_IMAGE_MODEL: 'gemini-x-image', IMAGE_MODE: 'AI_FULL' },
  ])('rejects an invalid mode or vision setting %j', (settings) => {
    expect(() => readImageGenerationConfig(settings)).toThrow();
  });
  it('keeps visual AI disabled even when the copy Gemini key is configured', () => {
    expect(readImageGenerationConfig({ GEMINI_API_KEY: 'copy-key' })).toEqual({
      provider: 'disabled',
      mode: 'COMPOSED',
    });
  });

  it('ignores unused settings when disabled', () => {
    expect(
      readImageGenerationConfig({
        IMAGE_PROVIDER: ' disabled ',
        GEMINI_IMAGE_MODEL: 'bad/path',
        GEMINI_IMAGE_TIMEOUT_MS: 'bad',
      }),
    ).toEqual({ provider: 'disabled', mode: 'COMPOSED' });
  });

  it('loads explicitly selected Gemini image settings independently of copy', () => {
    expect(
      readImageGenerationConfig({
        IMAGE_PROVIDER: ' gemini ',
        GEMINI_API_KEY: ' key ',
        GEMINI_IMAGE_MODEL: ' gemini-test-image ',
        GEMINI_COPY_MODEL: 'other-copy-model',
      }),
    ).toEqual({
      provider: 'gemini',
      mode: 'COMPOSED',
      settings: { apiKey: 'key', model: 'gemini-test-image', timeoutMs: 60000 },
    });
  });

  it('allows startup without a key, leaving availability enforcement to the adapter', () => {
    expect(
      readImageGenerationConfig({
        IMAGE_PROVIDER: 'gemini',
        GEMINI_IMAGE_MODEL: 'gemini-test-image',
      }),
    ).toMatchObject({ settings: { apiKey: null } });
  });

  it.each(['mock', 'unknown'])('rejects unsupported provider %s', (provider) => {
    expect(() => readImageGenerationConfig({ IMAGE_PROVIDER: provider })).toThrow('IMAGE_PROVIDER');
  });

  it.each([
    '',
    'gemini-test',
    '../models/gemini-image',
    'https://other/gemini-image',
    'gemini-image?key=x',
  ])('rejects missing, text-only or unsafe image model %j', (model) => {
    expect(() =>
      readImageGenerationConfig({ IMAGE_PROVIDER: 'gemini', GEMINI_IMAGE_MODEL: model }),
    ).toThrow('GEMINI_IMAGE_MODEL');
  });

  it.each(['0', '120001', 'NaN', '2.3', ''])('rejects timeout %j', (timeout) => {
    expect(() =>
      readImageGenerationConfig({
        IMAGE_PROVIDER: 'gemini',
        GEMINI_IMAGE_MODEL: 'gemini-test-image',
        GEMINI_IMAGE_TIMEOUT_MS: timeout,
      }),
    ).toThrow('GEMINI_IMAGE_TIMEOUT_MS');
  });
});
