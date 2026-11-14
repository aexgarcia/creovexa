import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import {
  domainFixture,
  ORG,
  OTHER_ORG,
  CAMPAIGN,
  GENERATION,
  testId,
} from '../../../support/campaign-fakes.js';
import type { GenerateImageInput } from '#app/modules/content-generation/application/ports/image-generator';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { OpenAIImageGenerator } from '#app/modules/content-generation/infrastructure/openai-image-generator';
describe('OpenAIImageGenerator', () => {
  let directory: string;
  let artifacts: LocalImageArtifacts;
  let input: GenerateImageInput;
  let source: Buffer;
  let generated: Buffer;
  const config = {
    apiKey: 'test-secret',
    model: 'gpt-image-2',
    quality: 'medium' as const,
    timeoutMs: 1000,
  };
  const envelope = (bytes: Buffer) => ({ data: [{ b64_json: bytes.toString('base64') }] });
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'creovexa-openai-image-'));
    artifacts = new LocalImageArtifacts(directory);
    source = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#123456' } })
      .png()
      .toBuffer();
    generated = await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: '#334455' },
    })
      .png()
      .toBuffer();
    const scope = {
      organizationId: ORG,
      campaignId: CAMPAIGN,
      generationId: GENERATION,
      operationId: testId(810),
    };
    const snapshot = domainFixture().snapshot.data;
    input = {
      ...scope,
      snapshot,
      imagePrompt: 'Producto iluminado sin texto',
      copy: { headline: 'Oferta', caption: 'Descripción', cta: snapshot.cta, hashtags: [] },
      referenceImage: {
        reference: await artifacts.write(scope, source),
        contentType: 'image/png',
        width: 16,
        height: 16,
      },
    };
  });
  afterAll(async () => {
    if (
      directory &&
      resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-openai-image-')
    )
      await rm(directory, { recursive: true });
  });
  it('sends one actual photo with explicit model, quality and size, then stores new PNG bytes', async () => {
    const http = vi.fn(async (url, options) => {
      expect(url).toBe('https://api.openai.com/v1/images/edits');
      expect(options.redirect).toBe('error');
      expect(options.headers).toEqual({ Authorization: 'Bearer test-secret' });
      const body = options.body as FormData;
      expect(body.get('model')).toBe('gpt-image-2');
      expect(body.get('quality')).toBe('medium');
      expect(body.get('size')).toBe('1024x1024');
      expect(body.get('n')).toBe('1');
      expect(body.get('input_fidelity')).toBeNull();
      expect(body.get('response_format')).toBeNull();
      expect(body.getAll('image[]')).toHaveLength(1);
      expect(Buffer.from(await (body.get('image[]') as File).arrayBuffer())).toEqual(source);
      expect(String(body.get('prompt'))).toContain(input.imagePrompt);
      return Response.json(envelope(generated));
    }) as unknown as typeof fetch;
    const result = await new OpenAIImageGenerator(config, artifacts, http).generate(input);
    expect(result).toMatchObject({ contentType: 'image/png', width: 1024, height: 1024 });
    expect(await artifacts.read({ ...input, source: result })).toEqual(generated);
    expect(http).toHaveBeenCalledOnce();
  });
  it.each([401, 403, 429, 500])(
    'does not retry HTTP %i or log provider secrets',
    async (status) => {
      const http = vi.fn(async () =>
        Response.json({ error: { message: config.apiKey } }, { status }),
      );
      const logger = { log: vi.fn() };
      await expect(
        new OpenAIImageGenerator(config, artifacts, http, logger).generate(input),
      ).rejects.toMatchObject({ code: status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE' });
      expect(http).toHaveBeenCalledOnce();
      expect(JSON.stringify(logger.log.mock.calls)).not.toContain(config.apiKey);
    },
  );
  it.each([
    {},
    { data: [] },
    { data: [{ url: 'https://evil/image.png' }] },
    { data: [{ b64_json: '???' }] },
    { data: [{ b64_json: 'YQ==' }, { b64_json: 'YQ==' }] },
  ])('rejects malformed output without fetching URLs', async (value) => {
    const http = vi.fn(async () => Response.json(value));
    await expect(
      new OpenAIImageGenerator(config, artifacts, http).generate(input),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(http).toHaveBeenCalledOnce();
  });
  it('rejects wrong dimensions, fake raster bytes and MIME', async () => {
    for (const bytes of [source, Buffer.from('<svg/>'), await sharp(generated).jpeg().toBuffer()]) {
      await expect(
        new OpenAIImageGenerator(config, artifacts, async () =>
          Response.json(envelope(bytes)),
        ).generate(input),
      ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    }
  });
  it('rejects a foreign reference and false metadata before any provider call', async () => {
    const http = vi.fn();
    for (const changed of [
      { ...input, organizationId: OTHER_ORG },
      { ...input, referenceImage: { ...input.referenceImage, width: 100 } },
    ])
      await expect(
        new OpenAIImageGenerator(config, artifacts, http).generate(changed),
      ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(http).not.toHaveBeenCalled();
  });
  it('bounds streamed response length and body timeout', async () => {
    const oversized = new Response('x', { headers: { 'content-length': '20000000' } });
    await expect(
      new OpenAIImageGenerator(config, artifacts, async () => oversized).generate(input),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    const stalled = new Response(new ReadableStream({ start() {} }));
    await expect(
      new OpenAIImageGenerator(
        { ...config, timeoutMs: 100 },
        artifacts,
        async () => stalled,
      ).generate(input),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('requires a key without silently using Gemini', () => {
    expect(() =>
      new OpenAIImageGenerator({ ...config, apiKey: null }, artifacts).assertAvailable(),
    ).toThrow('UNAVAILABLE');
  });
  it('bounds chunked bodies even without Content-Length and aborts stalled headers', async () => {
    const oversized = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(15 * 1024 * 1024));
          controller.close();
        },
      }),
    );
    await expect(
      new OpenAIImageGenerator(config, artifacts, async () => oversized).generate(input),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    const http: typeof fetch = async (_url, options) =>
      new Promise((_resolve, reject) => {
        options!.signal!.addEventListener('abort', () => reject(options!.signal!.reason), {
          once: true,
        });
      });
    await expect(
      new OpenAIImageGenerator({ ...config, timeoutMs: 100 }, artifacts, http).generate(input),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
});
