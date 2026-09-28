import { readOpenAICopyConfig } from './openai.config.js';
describe('OpenAI configuration', () => {
  it('is disabled by default', () => expect(readOpenAICopyConfig({}).apiKey).toBeNull());
  it('requires explicit model with credentials', () =>
    expect(() => readOpenAICopyConfig({ OPENAI_API_KEY: 'secret' })).toThrow('OPENAI_COPY_MODEL'));
  it.each(['0', '40001', 'abc', '1.5'])('rejects invalid timeout %s', (value) =>
    expect(() => readOpenAICopyConfig({ OPENAI_COPY_TIMEOUT_MS: value })).toThrow(),
  );
});
