import { DEFAULT_FLYER_DESIGN } from '#app/domain/value-objects/flyer-design';
import { validateRequest, RequestValidationError } from '#app/presentation/http/request-validation';
import { CreateTemplateRequest } from '#app/modules/templates/presentation/template.requests';
import { UpdateTemplateRequest } from '#app/modules/templates/presentation/update-template.request';

describe('Template design HTTP validation', () => {
  const base = { name: 'Oferta' };
  const design = DEFAULT_FLYER_DESIGN;
  it('accepts a complete design and allows omitting it', async () => {
    const pipe = validateRequest(CreateTemplateRequest);
    expect(await pipe.transform({ ...base, design }, { type: 'body' })).toMatchObject({ design });
    expect(await pipe.transform(base, { type: 'body' })).toMatchObject(base);
  });
  it('no longer accepts dimensions: they come from the format', async () => {
    await expect(
      validateRequest(CreateTemplateRequest).transform(
        { ...base, dimensions: { width: 1080, height: 1080 } },
        { type: 'body' },
      ),
    ).rejects.toBeInstanceOf(RequestValidationError);
  });
  it.each([
    null,
    { ...design, css: 'arbitrary' },
    { ...design, format: 'A4' },
    { ...design, elements: { ...design.elements, cta: 'false' } },
    { ...design, elements: { cta: true } },
    { ...design, elements: { ...design.elements, keyAttributes: 9 } },
    { ...design, elements: { ...design.elements, extra: true } },
  ])('rejects malformed design on both create and update %#', async (value) => {
    for (const [type, input] of [
      [CreateTemplateRequest, base],
      [
        UpdateTemplateRequest,
        { name: 'Oferta', expectedRevisionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      ],
    ] as const) {
      await expect(
        validateRequest(type).transform({ ...input, design: value }, { type: 'body' }),
      ).rejects.toBeInstanceOf(RequestValidationError);
    }
  });
});
