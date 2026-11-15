import {
  DEFAULT_FLYER_DESIGN,
  FlyerDesign,
  InvalidFlyerDesignError,
} from '#app/domain/value-objects/flyer-design';

const design = DEFAULT_FLYER_DESIGN;

describe('FlyerDesign', () => {
  it('defaults to a square, bold, dark promotion with the logo top right', () => {
    expect(FlyerDesign.create().data).toEqual(design);
    expect(FlyerDesign.create().size).toEqual({ width: 1080, height: 1080 });
  });

  it('copies and freezes the complete design, including the elements', () => {
    const input = {
      ...design,
      format: 'STORY',
      elements: { ...design.elements, logo: false, keyAttributes: 3 },
    };
    const result = FlyerDesign.create(input);
    input.elements.logo = true;
    expect(result.data.elements).toMatchObject({ logo: false, keyAttributes: 3 });
    expect(result.size).toEqual({ width: 1080, height: 1920 });
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(Object.isFrozen(result.data.elements)).toBe(true);
  });

  it.each([
    [null, 'design'],
    [[], 'design'],
    [{ ...design, format: 'A4' }, 'format'],
    [{ ...design, composition: '<script>' }, 'composition'],
    [{ ...design, mode: 'url(http://evil)' }, 'mode'],
    [{ ...design, css: 'body{display:none}' }, 'design.css'],
    [{ ...design, elements: { logo: true } }, 'elements.headline'],
    [{ ...design, elements: { ...design.elements, cta: 'false' } }, 'elements.cta'],
    [{ ...design, elements: { ...design.elements, keyAttributes: 5 } }, 'elements.keyAttributes'],
    [{ ...design, elements: { ...design.elements, keyAttributes: 1.5 } }, 'elements.keyAttributes'],
    [{ ...design, elements: { ...design.elements, extra: true } }, 'elements.extra'],
  ])('rejects invalid, incomplete or executable configuration %#', (value, field) => {
    expect(() => FlyerDesign.create(value)).toThrow(
      expect.objectContaining({ field }) as InvalidFlyerDesignError,
    );
  });
});
