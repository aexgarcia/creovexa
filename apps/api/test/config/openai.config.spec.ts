import { readOpenAICopyConfig } from '#app/config/openai.config';
describe('OpenAI configuration', () => {
  it('is disabled by default', () => expect(readOpenAICopyConfig({}).apiKey).toBeNull());
  it('requires explicit model with credentials', () =>
    expect(() => readOpenAICopyConfig({ OPENAI_API_KEY: 'secret' })).toThrow('OPENAI_COPY_MODEL'));
  it.each(['0', '40001', 'abc', '1.5'])('rejects invalid timeout %s', (value) =>
    expect(() => readOpenAICopyConfig({ OPENAI_COPY_TIMEOUT_MS: value })).toThrow(),
  );
  it('leaves the reasoning effort to the model when it is not configured', () =>
    expect(readOpenAICopyConfig({ OPENAI_COPY_REASONING_EFFORT: ' ' }).reasoningEffort).toBeNull());
  it.each(['none', 'minimal', 'low', 'max'])('accepts reasoning effort %s', (effort) =>
    expect(
      readOpenAICopyConfig({ OPENAI_COPY_REASONING_EFFORT: ` ${effort} ` }).reasoningEffort,
    ).toBe(effort),
  );
  it.each(['LOW', 'fast', '1'])('rejects reasoning effort %s', (effort) =>
    expect(() => readOpenAICopyConfig({ OPENAI_COPY_REASONING_EFFORT: effort })).toThrow(
      'OPENAI_COPY_REASONING_EFFORT',
    ),
  );
});
