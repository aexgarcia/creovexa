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
import { baseImageContext } from '#app/modules/content-generation/application/base-image-context';
import { buildFlyerBrief } from '#app/modules/content-generation/application/flyer-brief';
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
      headline: 'Tu producto favorito',
      brief: buildFlyerBrief(
        snapshot,
        { headline: 'Tu producto favorito', subheadline: null },
        null,
      ),
      styleImages: [],
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
      const prompt = String(body.get('prompt'));
      expect(prompt).toContain(JSON.stringify(baseImageContext(input.snapshot, input.headline)));
      // Sin IDs internos ni unidades menores.
      expect(prompt).not.toContain(input.snapshot.product.id);
      expect(prompt).not.toContain('amountMinor');
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
  it('sends the template style references after the photo, only as style', async () => {
    const data = domainFixture().snapshot.data;
    const brief = buildFlyerBrief(
      data,
      { headline: 'Tu producto favorito', subheadline: null },
      null,
      1,
    );
    const http = vi.fn(async (_url: string, options: RequestInit) => {
      const body = options.body as FormData;
      const images = body.getAll('image[]') as File[];
      expect(images.map((image) => image.name)).toEqual(['product.png', 'style-1.png']);
      expect(String(body.get('prompt'))).toContain('Image 2 is earlier flyers chosen by');
      return Response.json(envelope(generated));
    }) as unknown as typeof fetch;
    await new OpenAIImageGenerator(config, artifacts, http, undefined, 'AI_FULL').generate({
      ...input,
      brief,
      styleImages: [input.referenceImage],
    });
    expect(http).toHaveBeenCalledOnce();
    // COMPOSED nunca envía referencias de estilo.
    const composed = vi.fn(async (_url: string, options: RequestInit) => {
      expect((options.body as FormData).getAll('image[]')).toHaveLength(1);
      return Response.json(envelope(generated));
    }) as unknown as typeof fetch;
    await new OpenAIImageGenerator(config, artifacts, composed).generate({
      ...input,
      styleImages: [input.referenceImage],
    });
  });

  it('asks for the whole flyer in AI_FULL, in the size of the template format', async () => {
    const data = domainFixture().snapshot.data;
    const portrait = {
      ...data,
      template: {
        ...data.template,
        width: 1080,
        height: 1350,
        design: { ...data.template.design!, format: 'PORTRAIT' as const },
      },
    };
    const brief = buildFlyerBrief(
      portrait,
      { headline: 'Tu producto favorito', subheadline: null },
      null,
    );
    const flyer = await sharp({
      create: { width: 1024, height: 1280, channels: 3, background: '#334455' },
    })
      .png()
      .toBuffer();
    const http = vi.fn(async (_url: string, options: RequestInit) => {
      const body = options.body as FormData;
      expect(body.get('size')).toBe('1024x1280');
      expect(body.getAll('image[]')).toHaveLength(1);
      const prompt = String(body.get('prompt'));
      expect(prompt).toContain('4:5 format');
      expect(prompt).toContain('"Tu producto favorito"');
      expect(prompt).toContain('"Ahora S/ 15.00"');
      expect(prompt).not.toContain(data.product.id);
      return Response.json(envelope(flyer));
    }) as unknown as typeof fetch;
    const result = await new OpenAIImageGenerator(
      config,
      artifacts,
      http,
      undefined,
      'AI_FULL',
    ).generate({ ...input, snapshot: portrait, brief });
    expect(result).toMatchObject({ contentType: 'image/png', width: 1024, height: 1280 });
    // Una imagen cuadrada no sirve para un flyer vertical.
    await expect(
      new OpenAIImageGenerator(
        config,
        artifacts,
        async () => Response.json(envelope(generated)),
        undefined,
        'AI_FULL',
      ).generate({
        ...input,
        snapshot: portrait,
        brief,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
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
