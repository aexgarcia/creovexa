import { domainFixture } from '../../../support/campaign-fakes.js';
import { buildFlyerBrief } from '#app/modules/content-generation/application/flyer-brief';
import { buildFlyerPrompt } from '#app/modules/content-generation/application/flyer-prompt';

const TEXTS = { headline: 'Tu café favorito', subheadline: null };

describe('buildFlyerPrompt', () => {
  it('lists only the brief texts, verbatim, and the art direction', () => {
    const data = domainFixture().snapshot.data;
    const prompt = buildFlyerPrompt(buildFlyerBrief(data, TEXTS, null));
    expect(prompt).toContain('1:1 format');
    expect(prompt).toContain('- Headline (prominent): "Tu café favorito"');
    expect(prompt).toContain(
      '- Offer price (dominant: the largest, most eye-catching text): "Ahora S/ 15.00"',
    );
    expect(prompt).toContain(
      '- Offer validity (small and discreet, but legible): "Hasta el 19 de setiembre"',
    );
    expect(prompt).toContain('Visual hierarchy: "Ahora S/ 15.00"');
    expect(prompt).toContain('primary #5B3A29');
    expect(prompt).toContain('Never use these words: "gratis".');
    expect(prompt).toContain('Campaign notes (creative context only');
    // Sin logo en el brief no se reserva esquina.
    expect(prompt).not.toContain('LOGO AREA');
    expect(prompt).not.toContain(data.product.id);
    expect(prompt).not.toContain('amountMinor');
  });
  it('asks to leave the logo corner empty in the tone the logo needs', () => {
    const data = domainFixture().snapshot.data;
    const prompt = buildFlyerPrompt(
      buildFlyerBrief(data, TEXTS, { assetId: 'logo', isDark: true, aspectRatio: 2 }),
    );
    expect(prompt).toContain('LOGO AREA');
    expect(prompt).toContain('Do not draw any logo or brand mark');
    expect(prompt).toContain('in the top-right corner completely empty');
    // Logo oscuro en una plantilla oscura: la esquina debe ser clara.
    expect(prompt).toContain('this area must be light even though the flyer is dark');
  });
  it('names the style references and forbids copying their content', () => {
    const data = domainFixture().snapshot.data;
    const prompt = buildFlyerPrompt(buildFlyerBrief(data, TEXTS, null, 2));
    expect(prompt).toContain('REFERENCE IMAGES');
    expect(prompt).toContain('Images 2 to 3 are earlier flyers chosen by');
    expect(prompt).toContain('Never copy their texts, numbers, prices, products, people or logos.');
  });
  it('keeps the people in a person photo unaltered', () => {
    const data = domainFixture().snapshot.data;
    const person = { ...data, product: { ...data.product, photoType: 'PERSON' } };
    expect(buildFlyerPrompt(buildFlyerBrief(person, TEXTS, null))).toContain(
      'Never beautify, whiten, slim or otherwise alter the person.',
    );
  });
});
