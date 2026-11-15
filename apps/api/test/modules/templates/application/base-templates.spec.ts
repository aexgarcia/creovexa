import {
  BASE_TEMPLATES,
  findBaseTemplate,
} from '#app/modules/templates/application/base-templates';

describe('Base templates', () => {
  it('offers the five system templates with unique keys and valid designs', () => {
    expect(BASE_TEMPLATES.map((template) => template.key)).toEqual([
      'PROMOTION',
      'SHOWCASE',
      'LAUNCH',
      'PROFESSIONAL_SERVICE',
      'SEASONAL_STORY',
    ]);
    expect(Object.isFrozen(BASE_TEMPLATES)).toBe(true);
    expect(Object.isFrozen(BASE_TEMPLATES[0].design.elements)).toBe(true);
  });

  it('covers the three formats and hides prices in a launch', () => {
    expect(new Set(BASE_TEMPLATES.map((template) => template.design.format))).toEqual(
      new Set(['SQUARE', 'PORTRAIT', 'STORY']),
    );
    expect(findBaseTemplate('LAUNCH')?.design.elements).toMatchObject({
      regularPrice: false,
      promotionPrice: false,
    });
    expect(findBaseTemplate('UNKNOWN')).toBeNull();
  });
});
