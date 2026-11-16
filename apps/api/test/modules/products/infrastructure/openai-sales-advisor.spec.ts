import { OpenAISalesAdvisor } from '#app/modules/products/infrastructure/openai-sales-advisor';
import type { SalesSuggestionBrief } from '#app/modules/products/application/sales-suggestion-policy';

const config = {
  apiKey: 'test-secret',
  model: 'gpt-6-luna',
  reasoningEffort: 'low' as const,
  timeoutMs: 100,
};
const brief: SalesSuggestionBrief = {
  region: { country: 'PE', locale: 'es-PE' },
  business: {
    name: 'Café Andino',
    description: null,
    industry: 'Cafetería',
    brandTone: null,
    audience: null,
  },
  product: {
    kind: 'PRODUCT',
    name: 'Café de altura',
    productBrand: null,
    description: 'Tostado medio',
    keyAttributes: ['100 % arábica'],
    unit: null,
  },
};
const answer = { benefits: ['Despiertas sin acidez'], idealFor: 'Quien madruga' };
const completed = (output: unknown[]) => Response.json({ status: 'completed', output });
const message = (content: unknown[]) => [{ type: 'message', content }];

describe('OpenAISalesAdvisor', () => {
  it('sends a strict schema with the copy model and effort, once', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        completed(message([{ type: 'output_text', text: JSON.stringify(answer) }])),
      );
    const logs = { log: vi.fn() };
    expect(await new OpenAISalesAdvisor(true, config, http, logs).suggest(brief)).toEqual(answer);
    const sent = JSON.parse(http.mock.calls[0]![1]!.body as string);
    expect(sent).toMatchObject({ model: 'gpt-6-luna', reasoning: { effort: 'low' }, store: false });
    expect(sent.text.format.strict).toBe(true);
    expect(sent.text.format.schema.required).toEqual(['benefits', 'idealFor']);
    expect(JSON.parse(sent.input)).toEqual(brief);
    expect(JSON.stringify(logs.log.mock.calls)).not.toContain('test-secret');
  });
  it('is unavailable when disabled or without a key, without calling OpenAI', async () => {
    const http = vi.fn<typeof fetch>();
    for (const advisor of [
      new OpenAISalesAdvisor(false, config, http),
      new OpenAISalesAdvisor(true, { ...config, apiKey: null }, http),
    ]) {
      expect(advisor.available()).toBe(false);
      await expect(advisor.suggest(brief)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    }
    expect(http).not.toHaveBeenCalled();
  });
  it('does not retry a failed status nor expose the provider body', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('sensitive', { status: 500 }));
    const error = (await new OpenAISalesAdvisor(true, config, http)
      .suggest(brief)
      .catch((cause: unknown) => cause)) as Error;
    expect(error).toMatchObject({ code: 'UNAVAILABLE' });
    expect(error.message).not.toContain('sensitive');
    expect(http).toHaveBeenCalledOnce();
  });
  it.each([
    ['a refusal', completed(message([{ type: 'refusal' }])), 'REFUSED'],
    ['incomplete output', Response.json({ status: 'incomplete', output: [] }), 'INVALID_OUTPUT'],
    [
      'text that is not JSON',
      completed(message([{ type: 'output_text', text: 'no' }])),
      'INVALID_OUTPUT',
    ],
  ])('rejects %s', async (_case, response, code) => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(new OpenAISalesAdvisor(true, config, http).suggest(brief)).rejects.toMatchObject({
      code,
    });
  });
  it('reports a timeout', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('secret', 'TimeoutError'));
    await expect(new OpenAISalesAdvisor(true, config, http).suggest(brief)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    expect(http).toHaveBeenCalledOnce();
  });
});
