import { OpenAICopyGenerator } from '#app/modules/content-generation/infrastructure/openai-copy-generator';
import { domainFixture } from '../../../support/campaign-fakes.js';
import { validCopy } from '../../../support/generation-fakes.js';
const input = domainFixture().snapshot.data;
const copy = validCopy(input);
const config = {
  apiKey: 'test-secret',
  model: 'test-model',
  reasoningEffort: null,
  timeoutMs: 100,
};
const response = () =>
  new Response(
    JSON.stringify({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(copy) }] }],
    }),
  );
describe('OpenAICopyGenerator', () => {
  it('sends the configured reasoning effort to any model', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response());
    await new OpenAICopyGenerator(
      { ...config, model: 'gpt-6-luna', reasoningEffort: 'low' },
      http,
    ).generate(input);
    const sent = JSON.parse(http.mock.calls[0]![1]!.body as string);
    expect(sent.model).toBe('gpt-6-luna');
    expect(sent.reasoning).toEqual({ effort: 'low' });
    expect(sent.max_output_tokens).toBe(6000);
    expect(sent.text.format.strict).toBe(true);
  });
  it('omits the reasoning effort when it is not configured, even for gpt-5-mini', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response());
    await new OpenAICopyGenerator({ ...config, model: 'gpt-5-mini' }, http).generate(input);
    const sent = JSON.parse(http.mock.calls[0]![1]!.body as string);
    expect(sent).not.toHaveProperty('reasoning');
  });
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
  it('sends formatted prices and local dates, without IDs or minor units', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response());
    await new OpenAICopyGenerator(config, http).generate(input);
    const sent = JSON.parse(http.mock.calls[0]![1]!.body as string);
    const facts = JSON.parse(sent.input);
    expect(facts.requiredPriceTexts).toEqual(['S/ 20.00', 'S/ 15.00']);
    expect(facts.validity).toBe('Hasta el 19 de setiembre');
    expect(facts.cta).toBe(input.cta);
    expect(sent.input).not.toContain('amountMinor');
    expect(sent.input).not.toContain(input.product.id);
    expect(Object.keys(sent.text.format.schema.properties)).toEqual([
      'headline',
      'subheadline',
      'caption',
      'cta',
      'hashtags',
    ]);
    expect(sent.text.format.schema.properties.caption.pattern).toBeUndefined();
  });
  it('does not require a nonexistent promotion', async () => {
    const snapshot = { ...input, promotion: null };
    const content = { ...copy, caption: `${input.product.name}: S/ 20.00.` };
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        status: 'completed',
        output: [
          { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(content) }] },
        ],
      }),
    );
    await new OpenAICopyGenerator(config, http).generate(snapshot);
    const sent = JSON.parse(http.mock.calls[0]![1]!.body as string);
    expect(JSON.parse(sent.input).requiredPriceTexts).toEqual(['S/ 20.00']);
  });
  it('still rejects wrong prices instead of silently replacing provider values', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  ...copy,
                  caption: `${input.product.name}: S/ 2000.00 y S/ 1500.00`,
                }),
              },
            ],
          },
        ],
      }),
    );
    await expect(new OpenAICopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
    expect(http).toHaveBeenCalledOnce();
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
