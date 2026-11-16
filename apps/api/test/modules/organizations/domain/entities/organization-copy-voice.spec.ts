import { Organization } from '#app/modules/organizations/domain/entities/organization';

const id = '11111111-1111-4111-8111-111111111111';
const created = new Date('2026-09-17T12:00:00Z');
const updated = new Date('2026-09-17T13:00:00Z');

const create = (input: object = {}) =>
  Organization.create(id, { name: 'Empresa', ...input }, created);

// Voz de la marca para el copy (ADR-0029).
describe('Organization copy voice', () => {
  it('starts with few emojis, "tú" and no audience, value props nor examples', () => {
    const organization = create();
    expect(organization.audience).toBeNull();
    expect(organization.valueProps).toEqual([]);
    expect(organization.emojiStyle).toBe('FEW');
    expect(organization.addressForm).toBe('TU');
    expect(organization.copyExamples).toEqual([]);
  });

  it('normalizes the copy voice', () => {
    const organization = create({
      audience: '  Gamers de 18 a 35 años en Lima ',
      valueProps: [' Delivery en Lima ', 'Te asesoramos por WhatsApp'],
      emojiStyle: 'EXPRESSIVE',
      addressForm: 'USTED',
      copyExamples: [' Tu equipo merece estar a la altura 🎮 '],
    });
    expect(organization.audience).toBe('Gamers de 18 a 35 años en Lima');
    expect(organization.valueProps).toEqual(['Delivery en Lima', 'Te asesoramos por WhatsApp']);
    expect(organization.emojiStyle).toBe('EXPRESSIVE');
    expect(organization.addressForm).toBe('USTED');
    expect(organization.copyExamples).toEqual(['Tu equipo merece estar a la altura 🎮']);
    expect(Object.isFrozen(organization.valueProps)).toBe(true);
  });

  it.each([
    [{ audience: 'x'.repeat(201) }, 'audience'],
    [{ valueProps: ['a', 'b', 'c', 'd'] }, 'valueProps'],
    [{ valueProps: ['Delivery', 'delivery'] }, 'valueProps'],
    [{ valueProps: ['x'.repeat(81)] }, 'valueProps'],
    [{ emojiStyle: 'MANY' }, 'emojiStyle'],
    [{ addressForm: 'tú' }, 'addressForm'],
    [{ copyExamples: ['a', 'b', 'c', 'd'] }, 'copyExamples'],
    [{ copyExamples: ['x'.repeat(601)] }, 'copyExamples'],
  ])('rejects an invalid copy voice %j', (input, field) => {
    expect(() => create(input)).toThrow(expect.objectContaining({ field }) as Error);
  });

  it('keeps omitted fields, clears lists with [] and goes back to the defaults with null', () => {
    const organization = create({
      audience: 'Gamers',
      valueProps: ['Delivery'],
      emojiStyle: 'NONE',
      addressForm: 'USTED',
      copyExamples: ['Ejemplo'],
    });
    const kept = organization.updateProfile({ name: 'Otra' }, updated);
    expect([kept.audience, kept.valueProps, kept.emojiStyle, kept.addressForm]).toEqual([
      'Gamers',
      ['Delivery'],
      'NONE',
      'USTED',
    ]);
    const cleared = organization.updateProfile(
      { audience: null, valueProps: [], emojiStyle: null, addressForm: null, copyExamples: [] },
      updated,
    );
    expect([
      cleared.audience,
      cleared.valueProps,
      cleared.emojiStyle,
      cleared.addressForm,
      cleared.copyExamples,
    ]).toEqual([null, [], 'FEW', 'TU', []]);
  });
});
