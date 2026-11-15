import { domainFixture } from '../../../support/campaign-fakes.js';
import { validCopy } from '../../../support/generation-fakes.js';
import {
  containsWord,
  copyBrief,
  flyerTextsProblem,
  normalizeFlyerTexts,
  validateCopy,
} from '#app/modules/content-generation/application/copy-policy';
import { CopyGenerationError } from '#app/modules/content-generation/application/ports/copy-generator';
import type { GenerationSnapshotData } from '#app/modules/campaigns/contract';

const snapshot = () => domainFixture().snapshot.data;
// El mismo snapshot sin promoción: "oferta" y "descuento" dejan de ser verdad.
const withoutPromotion = (): GenerationSnapshotData => ({ ...snapshot(), promotion: null });

describe('copyBrief', () => {
  it('sends formatted prices and local validity, without IDs or minor units', () => {
    const brief = copyBrief(snapshot());
    expect(brief.requiredPriceTexts).toEqual(['S/ 20.00', 'S/ 15.00']);
    // 2026-09-20T00:00Z es el 19 de setiembre a las 19:00 en Lima (es-PE escribe «setiembre»).
    expect(brief.validity).toBe('Hasta el 19 de setiembre');
    expect(brief.objective).toBe('PROMOTION');
    expect(brief.business).toMatchObject({ name: expect.any(String), industry: 'Cafetería' });
    const text = JSON.stringify(brief);
    expect(text).not.toContain('amountMinor');
    expect(text).not.toContain(snapshot().product.id);
    expect(text).not.toContain(snapshot().organization.id);
  });
  it('sends the language region and only the contact channels the caption may name', () => {
    const data = snapshot();
    const brief = copyBrief({
      ...data,
      organization: {
        ...data.organization,
        contact: {
          whatsapp: '+51 999 000 111',
          website: null,
          instagram: '@cafe',
          address: 'Av. Lima 1',
        },
      },
    });
    expect(brief.region).toEqual({
      country: data.organization.region.country,
      locale: data.organization.region.locale,
    });
    expect(brief.contact).toEqual({ whatsapp: '+51 999 000 111', instagram: '@cafe' });
    expect(JSON.stringify(brief)).not.toContain('Av. Lima 1');
    expect(
      copyBrief({ ...data, organization: { ...data.organization, contact: null } }).contact,
    ).toBeNull();
  });
  it('adds the discount only when the campaign asks for it', () => {
    expect(copyBrief(snapshot()).discount).toBeNull();
    const data = snapshot();
    const shown = { ...data, promotion: { ...data.promotion!, showDiscount: true } };
    expect(copyBrief(shown).discount).toBe('-25 %');
  });
});

describe('flyer texts', () => {
  it('normalizes spaces and treats an empty subheadline as none', () => {
    expect(normalizeFlyerTexts({ headline: '  Café   de\naltura ', subheadline: '  ' })).toEqual({
      headline: 'Café de altura',
      subheadline: null,
    });
  });
  it.each([
    [{ headline: 'Hi', subheadline: null }, 'headline'],
    [{ headline: 'x'.repeat(46), subheadline: null }, 'headline'],
    [{ headline: 'Ahora S/ 15.00', subheadline: null }, 'headline'],
    [{ headline: 'Rebaja del 25%', subheadline: null }, 'headline'],
    [{ headline: 'Envío gratis hoy', subheadline: null }, 'headline'],
    [{ headline: 'Con GARANTIA total', subheadline: null }, 'headline'],
    [{ headline: 'Café de altura', subheadline: 'y'.repeat(71) }, 'subheadline'],
    [{ headline: 'Café de altura', subheadline: 'Solo PEN 15.00' }, 'subheadline'],
  ])('rejects %j in %s', (texts, field) => {
    expect(flyerTextsProblem(texts, snapshot())).toBe(field);
  });
  it('allows offer words only when there is a promotion', () => {
    const texts = { headline: 'Oferta de temporada', subheadline: null };
    expect(flyerTextsProblem(texts, snapshot())).toBeNull();
    expect(flyerTextsProblem(texts, withoutPromotion())).toBe('headline');
  });
  it('applies the brand forbidden words', () => {
    const data = snapshot();
    const brand = {
      ...data,
      organization: { ...data.organization, forbiddenWords: ['el mejor'] },
    };
    expect(flyerTextsProblem({ headline: 'El  mejor café', subheadline: null }, brand)).toBe(
      'headline',
    );
  });
  it('matches whole words, ignoring case and accents', () => {
    expect(containsWord('Ofertas del mes', 'oferta')).toBe(false);
    expect(containsWord('Garantía real', 'garantia')).toBe(true);
  });
});

describe('validateCopy', () => {
  it.each([
    { caption: 'Producto\nS/ 0.01' },
    { caption: 'Sin nombre del producto S/ 20.00 S/ 15.00' },
    { caption: 'Producto PEN 20.00 PEN 15.00' },
    { cta: 'CTA diferente' },
    { headline: 'Garantía total' },
    { subheadline: 'Producto certificado' },
    { hashtags: ['#Gratis'] },
    { hashtags: ['#EnvioGratis'] },
    { imagePrompt: 'Ya no se genera' },
  ])('rejects invented or unexpected fields %j', (change) => {
    expect(() => validateCopy({ ...validCopy(), ...change }, snapshot())).toThrow(
      CopyGenerationError,
    );
  });
  it('fixes the hashtag format and validates the result', () => {
    expect(
      validateCopy({ ...validCopy(), hashtags: [' #Cafe', 'Altura '] }, snapshot()).hashtags,
    ).toEqual(['#Cafe', '#Altura']);
  });
  it.each([[['#Cafe', ' #Cafe']], [['#Café de altura']], [[' #Gratis']]])(
    'still rejects hashtags %j after fixing their format',
    (hashtags) => {
      expect(() => validateCopy({ ...validCopy(), hashtags }, snapshot())).toThrow(
        CopyGenerationError,
      );
    },
  );
  it('rejects a missing subheadline field', () => {
    const rest: Partial<ReturnType<typeof validCopy>> = validCopy();
    delete rest.subheadline;
    expect(() => validateCopy(rest, snapshot())).toThrow(CopyGenerationError);
  });
  it('accepts original wording with exact prices and stores flyer texts apart', () => {
    expect(
      validateCopy(
        {
          headline: 'Tu café favorito',
          subheadline: '',
          caption:
            'Conoce Producto, pensado para tu día a día.\nAntes S/ 20.00, ahora S/15.00 hasta el 19 de setiembre.',
          cta: 'Comprar ahora',
          hashtags: ['#Cafe'],
        },
        snapshot(),
      ),
    ).toEqual({
      headline: 'Tu café favorito',
      subheadline: null,
      caption:
        'Conoce Producto, pensado para tu día a día.\nAntes S/ 20.00, ahora S/15.00 hasta el 19 de setiembre.',
      cta: 'Comprar ahora',
      hashtags: ['#Cafe'],
    });
  });
});
