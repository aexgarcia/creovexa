import { GeminiSalesAdvisor } from '#app/modules/products/infrastructure/gemini-sales-advisor';
import type { SalesSuggestionBrief } from '#app/modules/products/application/sales-suggestion-policy';

const config = { apiKey: 'test-secret', model: 'gemini-3.5-flash-lite', timeoutMs: 100 };
const brief: SalesSuggestionBrief = {
  region: { country: 'PE', locale: 'es-PE' },
  business: {
    name: 'Café Andino',
    description: null,
    industry: null,
    brandTone: null,
    audience: null,
  },
  product: {
    kind: 'SERVICE',
    name: 'Cata guiada',
    productBrand: null,
    description: null,
    keyAttributes: [],
    unit: 'por sesión',
  },
};
const answer = {
  benefits: ['Aprendes a reconocer tu café favorito'],
  idealFor: 'Curiosos del café',
};
const candidate = (parts: unknown[], finishReason = 'STOP') =>
  Response.json({ candidates: [{ finishReason, content: { parts } }] });

describe('GeminiSalesAdvisor', () => {
  it('sends the instruction and the brief with a JSON schema, once', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(candidate([{ thought: true }, { text: JSON.stringify(answer) }]));
    expect(await new GeminiSalesAdvisor(true, config, http).suggest(brief)).toEqual(answer);
    const [url, options] = http.mock.calls[0]!;
    expect(String(url)).toContain('gemini-3.5-flash-lite:generateContent');
    const sent = JSON.parse(options!.body as string);
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(JSON.parse(sent.contents[0].parts[0].text)).toEqual(brief);
    expect(http).toHaveBeenCalledOnce();
  });
  it('is unavailable when disabled', async () => {
    const http = vi.fn<typeof fetch>();
    await expect(new GeminiSalesAdvisor(false, config, http).suggest(brief)).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(http).not.toHaveBeenCalled();
  });
  it.each([
    ['a safety block', candidate([{ text: '{}' }], 'SAFETY'), 'REFUSED'],
    ['a truncated answer', candidate([{ text: '{}' }], 'MAX_TOKENS'), 'INVALID_OUTPUT'],
    ['a failed status', new Response('sensitive', { status: 429 }), 'UNAVAILABLE'],
  ])('rejects %s', async (_case, response, code) => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(new GeminiSalesAdvisor(true, config, http).suggest(brief)).rejects.toMatchObject({
      code,
    });
    expect(http).toHaveBeenCalledOnce();
  });
});
