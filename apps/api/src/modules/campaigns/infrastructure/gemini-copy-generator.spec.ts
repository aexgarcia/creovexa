import { GeminiCopyGenerator } from './gemini-copy-generator.js';
import { domainFixture } from '../../../../test/support/campaign-fakes.js';
import { copyChoices } from '../application/copy-policy.js';
const input = domainFixture().snapshot.data;
const choices = copyChoices(input);
const copy = {
  headline: choices.headline[0],
  caption: choices.caption[0],
  cta: choices.cta[0],
  hashtags: [],
  imagePrompt: choices.imagePrompt[0],
};
const config = { apiKey: 'test-gemini-secret', model: 'gemini-test', timeoutMs: 100 };
const envelope = (text = JSON.stringify(copy)) => ({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
});
describe('GeminiCopyGenerator', () => {
  it('uses a fixed Google endpoint, header key and structured schema', async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json(envelope()));
    const logger = { log: vi.fn() };
    expect(await new GeminiCopyGenerator(config, http, logger).generate(input)).toEqual(copy);
    const [url, request] = http.mock.calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    );
    expect(url).not.toContain(config.apiKey);
    expect(new Headers(request!.headers).get('x-goog-api-key')).toBe(config.apiKey);
    const body = JSON.parse(request!.body as string);
    expect(body.generationConfig.responseFormat.text.mimeType).toBe('application/json');
    expect(body.generationConfig.responseFormat.text.schema.additionalProperties).toBe(false);
    expect(body.generationConfig.responseFormat.text.schema.properties.cta.enum).toEqual([
      input.cta,
    ]);
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(config.apiKey);
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(input.product.description);
  });
  it('joins text parts while ignoring thoughts', async () => {
    const text = JSON.stringify(copy);
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                { thought: true, text: 'private reasoning' },
                { text: text.slice(0, 20) },
                { text: text.slice(20) },
              ],
            },
          },
        ],
      }),
    );
    expect(await new GeminiCopyGenerator(config, http).generate(input)).toEqual(copy);
  });
  it.each([
    { promptFeedback: { blockReason: 'SAFETY' } },
    { candidates: [{ finishReason: 'SAFETY' }] },
  ])('rejects blocked responses without retry', async (body) => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    await expect(new GeminiCopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'REFUSED',
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it.each([
    { candidates: [] },
    { candidates: [null] },
    { candidates: [{ finishReason: 'MAX_TOKENS' }] },
    envelope('not JSON'),
    envelope(JSON.stringify({ ...copy, caption: 'Envío gratis' })),
  ])('rejects incomplete, malformed or invented output', async (body) => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
    await expect(new GeminiCopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'INVALID_OUTPUT',
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it.each([429, 503])('retries transient %s once', async (status) => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status }))
      .mockResolvedValueOnce(Response.json(envelope()));
    await expect(new GeminiCopyGenerator(config, http).generate(input)).resolves.toEqual(copy);
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('never exceeds two attempts or uses another provider', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response('', { status: 429 }));
    await expect(new GeminiCopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(http).toHaveBeenCalledTimes(2);
    expect(
      http.mock.calls.every(([url]) =>
        String(url).startsWith('https://generativelanguage.googleapis.com/'),
      ),
    ).toBe(true);
  });
  it('does not retry authorization failures or leak response bodies', async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('private error', { status: 403 }));
    await expect(new GeminiCopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('aborts slow requests and reports a safe timeout', async () => {
    const http = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options!.signal!.addEventListener('abort', () => reject(options!.signal!.reason), {
            once: true,
          });
        }),
    );
    await expect(new GeminiCopyGenerator(config, http).generate(input)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('does not make any request without a Gemini key', async () => {
    const http = vi.fn<typeof fetch>();
    await expect(
      new GeminiCopyGenerator({ ...config, apiKey: null }, http).generate(input),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(http).not.toHaveBeenCalled();
  });
});
