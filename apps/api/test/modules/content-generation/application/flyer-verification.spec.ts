import { domainFixture } from '../../../support/campaign-fakes.js';
import { buildFlyerBrief } from '#app/modules/content-generation/application/flyer-brief';
import {
  amounts,
  readDates,
  verifyFlyer,
  type FlyerReading,
} from '#app/modules/content-generation/application/flyer-verification';

const brief = () =>
  buildFlyerBrief(
    domainFixture().snapshot.data,
    { headline: 'Tu café favorito', subheadline: null },
    null,
  );

// Una lectura que coincide con el brief, con el CTA en mayúsculas como lo pondría un diseño.
function reading(): FlyerReading {
  return {
    texts: [
      { text: 'Tu café favorito', kind: 'headline' },
      { text: 'Prod', kind: 'product_name' },
      { text: 'Antes S/ 20.00', kind: 'regular_price' },
      { text: 'Ahora S/ 15.00', kind: 'promotion_price' },
      { text: 'Hasta el 19 de setiembre', kind: 'validity' },
      { text: 'COMPRAR AHORA', kind: 'cta' },
      { text: '500 g', kind: 'product_text' },
    ],
    logo: { visible: false, text: '' },
  };
}

describe('verifyFlyer', () => {
  it('accepts a flyer whose prices, dates and texts match the brief', () => {
    expect(verifyFlyer(brief(), reading(), null)).toMatchObject({ ok: true, observations: [] });
  });
  it('accepts a currency symbol drawn apart from the amount', () => {
    const value = reading();
    value.texts.splice(
      3,
      1,
      { text: 'S/', kind: 'other' },
      { text: '15.00', kind: 'promotion_price' },
    );
    expect(verifyFlyer(brief(), value, null).prices).toBe(true);
  });
  it.each([
    ['a wrong price', { text: 'Ahora S/ 51.00', kind: 'promotion_price' as const }, 3],
    ['a wrong date', { text: 'Hasta el 20 de setiembre', kind: 'validity' as const }, 4],
    ['a changed headline', { text: 'Tu cafe favorito', kind: 'headline' as const }, 0],
  ])('rejects %s', (_name, block, index) => {
    const value = reading();
    value.texts[index] = block;
    const result = verifyFlyer(brief(), value, null);
    expect(result.ok).toBe(false);
    expect(result.observations.length).toBeGreaterThan(0);
  });
  it('rejects extra prices or dates the brief did not ask for', () => {
    const value = reading();
    value.texts.push({ text: 'S/ 9.90', kind: 'other_price' });
    expect(verifyFlyer(brief(), value, null)).toMatchObject({ ok: false, prices: false });
    const dated = reading();
    dated.texts.push({ text: 'Desde el 1 de octubre', kind: 'other' });
    expect(verifyFlyer(brief(), dated, null)).toMatchObject({ ok: false, dates: false });
  });
  it('ignores numbers without currency printed on the product', () => {
    const value = reading();
    value.texts.push({ text: '100', kind: 'other_price' });
    expect(verifyFlyer(brief(), value, null).ok).toBe(true);
  });
  it('fails when the logo covers text, but only notes an object under it', () => {
    expect(
      verifyFlyer(brief(), reading(), {
        hasText: true,
        text: 'Nuevo en',
        hasObject: false,
        object: '',
      }),
    ).toMatchObject({ ok: false, logoCoversText: true });
    const scene = verifyFlyer(brief(), reading(), {
      hasText: false,
      text: '',
      hasObject: true,
      object: 'una hoja',
    });
    expect(scene.ok).toBe(true);
    expect(scene.observations).toEqual(['bajo el logo había: una hoja']);
  });
});

describe('reading helpers', () => {
  it('reads amounts in several notations', () => {
    expect(amounts('S/ 1,299.00')).toEqual([129900]);
    expect(amounts('1.299,00')).toEqual([129900]);
    expect(amounts('89.9')).toEqual([8990]);
  });
  it('reads dates written in Spanish or with slashes', () => {
    expect(readDates('Del 1 de diciembre al 15 de setiembre')).toEqual([
      { day: 1, month: 12 },
      { day: 15, month: 9 },
    ]);
    expect(readDates('Hasta el 31/12')).toEqual([{ day: 31, month: 12 }]);
  });
});
