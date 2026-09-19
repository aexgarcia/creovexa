import { TemplateDimensions } from './template-dimensions.js';
import { InvalidTemplateDimensionsError } from '../errors/template.errors.js';

describe('TemplateDimensions', () => {
  it.each([
    [1080, 1080],
    [1080, 1350],
    [1080, 1920],
    [1, 1],
  ])(
    'represents positive dimensions %s × %s independently of rendering support',
    (width, height) => {
      const dimensions = TemplateDimensions.create(width, height);
      expect(dimensions.width).toBe(width);
      expect(dimensions.height).toBe(height);
    },
  );

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid dimension %s on either axis',
    (value) => {
      expect(() => TemplateDimensions.create(value, 1080)).toThrow(InvalidTemplateDimensionsError);
      expect(() => TemplateDimensions.create(1080, value)).toThrow(InvalidTemplateDimensionsError);
    },
  );

  it('compares both dimensions by value', () => {
    const square = TemplateDimensions.create(1080, 1080);
    expect(square.equals(TemplateDimensions.create(1080, 1080))).toBe(true);
    expect(square.equals(TemplateDimensions.create(1080, 1350))).toBe(false);
    expect(square.equals(TemplateDimensions.create(1350, 1080))).toBe(false);
  });

  it('cannot be mutated after validation', () => {
    const dimensions = TemplateDimensions.create(1080, 1080);
    expect(() => Object.assign(dimensions, { width: -1 })).toThrow(TypeError);
    expect(dimensions.width).toBe(1080);
  });
});
