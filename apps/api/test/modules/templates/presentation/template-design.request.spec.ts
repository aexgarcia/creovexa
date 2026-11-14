import { FlyerDesign } from '#app/domain/value-objects/flyer-design';
import { validateRequest, RequestValidationError } from '#app/presentation/http/request-validation';
import { CreateTemplateRequest } from '#app/modules/templates/presentation/template.requests';
import { UpdateTemplateRequest } from '#app/modules/templates/presentation/update-template.request';

describe('Template design HTTP validation', () => {
  const base = { name: 'Oferta', dimensions: { width: 1080, height: 1080 } };
  const design = FlyerDesign.create().data;
  it('accepts a complete design and allows omission for existing clients', async () => {
    const pipe = validateRequest(CreateTemplateRequest);
    expect(await pipe.transform({ ...base, design }, { type: 'body' })).toMatchObject({ design });
    expect(await pipe.transform(base, { type: 'body' })).toMatchObject(base);
  });
  it.each([
    null,
    { ...design, css: 'arbitrary' },
    { ...design, layout: 'unknown' },
    { ...design, settings: { ...design.settings, showCta: 'false' } },
    { ...design, settings: { showCta: true } },
    { ...design, settings: { ...design.settings, extra: true } },
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
