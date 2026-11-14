import { FlyerDesign, InvalidFlyerDesignError } from '#app/domain/value-objects/flyer-design';

describe('FlyerDesign', () => {
  it('provides the previous classic blue design for existing clients', () => {
    expect(FlyerDesign.create().data).toMatchObject({
      layout: 'CLASSIC',
      palette: 'BLUE',
      settings: { showMainImage: true, showCta: true },
    });
  });
  it('copies and freezes the complete design, including visibility settings', () => {
    const input = {
      ...FlyerDesign.create().data,
      layout: 'PRODUCT_FOCUS',
      palette: 'CORAL',
      settings: { ...FlyerDesign.create().data.settings, showLogo: false },
    };
    const result = FlyerDesign.create(input);
    input.settings.showLogo = true;
    expect(result.data.settings.showLogo).toBe(false);
    expect(Object.isFrozen(result.data)).toBe(true);
    expect(Object.isFrozen(result.data.settings)).toBe(true);
  });
  it.each([
    null,
    [],
    {},
    { ...FlyerDesign.create().data, layout: '<script>' },
    { ...FlyerDesign.create().data, palette: 'url(http://evil)' },
    { ...FlyerDesign.create().data, css: 'body{display:none}' },
    { ...FlyerDesign.create().data, settings: { showLogo: true } },
    {
      ...FlyerDesign.create().data,
      settings: { ...FlyerDesign.create().data.settings, showLogo: 'false' },
    },
    {
      ...FlyerDesign.create().data,
      settings: { ...FlyerDesign.create().data.settings, extra: true },
    },
  ])('rejects invalid, incomplete or executable configuration %#', (value) => {
    expect(() => FlyerDesign.create(value)).toThrow(InvalidFlyerDesignError);
  });
});
