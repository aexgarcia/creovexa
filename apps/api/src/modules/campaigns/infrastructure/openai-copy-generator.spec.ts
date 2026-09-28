import { OpenAICopyGenerator } from './openai-copy-generator.js';
import { domainFixture } from '../../../../test/support/campaign-fakes.js';
import { copyChoices } from '../application/copy-policy.js';
const input = domainFixture().snapshot.data;
const options = copyChoices(input);
const copy = {
  headline: options.headline[0],
  caption: options.caption[0],
  cta: options.cta[0],
  hashtags: [],
  imagePrompt: options.imagePrompt[0],
};
const config = { apiKey: 'test-secret', model: 'test-model', timeoutMs: 100 };
const response = () =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(copy) }] }],
    }),
  );
describe('OpenAICopyGenerator', () => {
  it('requests strict structured output and validates the returned content', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response());
    const logs = { log: vi.fn() };
    const generator = new OpenAICopyGenerator(config, http, logs);
    expect(await generator.generate(input)).toEqual(copy);
    const sent = JSON.parse(http.mock.calls[0]![1]!.body as string);
    expect(sent.text.format.strict).toBe(true);
    expect(sent.store).toBe(false);
    expect(JSON.stringify(logs.log.mock.calls)).not.toContain('test-secret');
    expect(JSON.stringify(logs.log.mock.calls)).not.toContain(input.product.description);
  });
  it('retries a transient status once', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(response());
    await expect(new OpenAICopyGenerator(config, http).generate(input)).resolves.toEqual(copy);
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('does not retry unauthorized responses or expose provider body', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('sensitive', { status: 401 }));
    await expect(new OpenAICopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('rejects a refusal', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'refusal' }] }],
        }),
      ),
    );
    await expect(new OpenAICopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'REFUSED',
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete output', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'incomplete', output: [] })));
    await expect(new OpenAICopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
  });
  it('bounds timeout retries and emits only safe errors', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('secret', 'TimeoutError'));
    await expect(new OpenAICopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('does not call OpenAI when disabled', async () => {
    const http = vi.fn<typeof fetch>();
    const generator = new OpenAICopyGenerator({ ...config, apiKey: null }, http);
    await expect(generator.generate(input)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(http).not.toHaveBeenCalled();
  });
});
