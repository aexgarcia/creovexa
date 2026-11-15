import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { CAMPAIGN, GENERATION, ORG, testId } from '../../../support/campaign-fakes.js';
import type { ReadFlyerInput } from '#app/modules/content-generation/application/ports/flyer-reader';
import { LocalImageArtifacts } from '#app/modules/content-generation/infrastructure/local-image-artifacts';
import { OpenAIFlyerReader } from '#app/modules/content-generation/infrastructure/openai-flyer-reader';

const config = { model: 'gpt-5-mini', timeoutMs: 1000 };
const answer = (value: unknown) =>
  Response.json({
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
  });

describe('OpenAIFlyerReader', () => {
  let directory: string;
  let artifacts: LocalImageArtifacts;
  let input: ReadFlyerInput;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'creovexa-flyer-reader-'));
    artifacts = new LocalImageArtifacts(directory);
    const scope = {
      organizationId: ORG,
      campaignId: CAMPAIGN,
      generationId: GENERATION,
      operationId: testId(830),
    };
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    input = {
      ...scope,
      image: {
        reference: await artifacts.write(scope, png),
        contentType: 'image/png',
        width: 8,
        height: 8,
      },
    };
  });
  afterAll(async () => {
    if (
      directory &&
      resolve(directory).startsWith(resolve(tmpdir()) + sep + 'creovexa-flyer-reader-')
    )
      await rm(directory, { recursive: true });
  });

  it('transcribes the flyer with a strict schema and the image inline', async () => {
    const reading = {
      texts: [{ text: 'Ahora S/ 15.00', kind: 'promotion_price' }],
      logo: { visible: true, text: 'Café Andino' },
    };
    const http = vi.fn<typeof fetch>().mockResolvedValue(answer(reading));
    expect(await new OpenAIFlyerReader('test-secret', config, artifacts, http).read(input)).toEqual(
      reading,
    );
    const body = JSON.parse(http.mock.calls[0]![1]!.body as string);
    expect(body.model).toBe('gpt-5-mini');
    expect(body.store).toBe(false);
    expect(body.text.format.strict).toBe(true);
    expect(body.input[0].content[0].image_url).toMatch(/^data:image\/png;base64,/);
    // La lectura no conoce los textos esperados.
    expect(JSON.stringify(body)).not.toContain('15.00');
  });

  it('reviews the logo area', async () => {
    const review = { hasText: true, text: 'Nuevo', hasObject: false, object: '' };
    const http = vi.fn<typeof fetch>().mockResolvedValue(answer(review));
    expect(
      await new OpenAIFlyerReader('test-secret', config, artifacts, http).reviewLogoArea(input),
    ).toEqual(review);
  });

  it.each([
    [new Response('', { status: 429 }), 'RATE_LIMITED'],
    [new Response('secret', { status: 500 }), 'UNAVAILABLE'],
    [
      answer({ texts: [{ text: 'x', kind: 'invented' }], logo: { visible: true, text: '' } }),
      'INVALID_OUTPUT',
    ],
    [
      Response.json({
        status: 'completed',
        output: [{ type: 'message', content: [{ type: 'refusal' }] }],
      }),
      'REFUSED',
    ],
    [Response.json({ status: 'incomplete', output: [] }), 'INVALID_OUTPUT'],
  ])('maps a provider failure without retrying (%#)', async (response, code) => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(response as Response);
    await expect(
      new OpenAIFlyerReader('test-secret', config, artifacts, http).read(input),
    ).rejects.toMatchObject({ code });
    expect(http).toHaveBeenCalledOnce();
  });

  it('times out and never calls without a key', async () => {
    const timeout = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException('slow', 'TimeoutError'));
    await expect(
      new OpenAIFlyerReader('test-secret', config, artifacts, timeout).read(input),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
    const http = vi.fn<typeof fetch>();
    await expect(
      new OpenAIFlyerReader(null, config, artifacts, http).read(input),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(http).not.toHaveBeenCalled();
  });
});
