import { Organization } from '#app/modules/organizations/domain/entities/organization';
import { Currency } from '#app/domain/value-objects/money';

const id = '11111111-1111-4111-8111-111111111111';
const logo = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherLogo = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const created = new Date('2026-09-17T12:00:00Z');
const updated = new Date('2026-09-17T13:00:00Z');
const colors = {
  primary: '#5b3a29',
  secondary: '#C98B4E',
  accent: '#E4572E',
  lightBackground: '#F7F1E8',
  darkBackground: '#1E120D',
};
const suggested = { ...colors, primary: '#112233' };
const traits = { isDark: true, suggestedColors: suggested };

describe('Organization brand kit', () => {
  it('starts in the region the system used before it was configurable', () => {
    const organization = Organization.create(id, { name: 'Empresa' }, created);
    expect(organization.region).toEqual({
      country: 'PE',
      locale: 'es-PE',
      timeZone: 'America/Lima',
      currency: Currency.PEN,
    });
    expect(organization.industry).toBeNull();
    expect(organization.brandColors).toBeNull();
    expect(organization.effectiveBrandColors).toBeNull();
  });

  it('normalizes the industry, region and colors', () => {
    const organization = Organization.create(
      id,
      {
        name: 'Empresa',
        industry: '  Cafetería ',
        region: { country: 'mx', locale: 'es-mx', timeZone: 'America/Mexico_City' },
        brandColors: colors,
      },
      created,
    );
    expect(organization.industry).toBe('Cafetería');
    expect(organization.region).toMatchObject({ country: 'MX', locale: 'es-MX' });
    expect(organization.brandColors?.primary).toBe('#5B3A29');
  });

  it.each([
    [{ industry: 'x'.repeat(81) }, 'industry'],
    [{ region: { country: 'PER' } }, 'region.country'],
    [{ region: { locale: 'not a locale!' } }, 'region.locale'],
    [{ region: { timeZone: 'Mars/Olympus' } }, 'region.timeZone'],
    [{ region: { currency: 'BTC' as Currency } }, 'region.currency'],
    [{ brandColors: { ...colors, accent: 'red' } }, 'brandColors.accent'],
  ])('rejects an invalid brand kit field %j', (input, field) => {
    expect(() => Organization.create(id, { name: 'Empresa', ...input }, created)).toThrow(
      expect.objectContaining({ field }) as Error,
    );
  });

  it('changes only the region fields sent', () => {
    const organization = Organization.create(id, { name: 'Empresa' }, created).updateProfile(
      { region: { currency: Currency.USD } },
      updated,
    );
    expect(organization.region).toEqual({
      country: 'PE',
      locale: 'es-PE',
      timeZone: 'America/Lima',
      currency: Currency.USD,
    });
  });

  it('uses the logo colors until the user chooses their own, and goes back on null', () => {
    const organization = Organization.restore(
      id,
      { name: 'Empresa', logoAssetId: logo },
      created,
      created,
      traits,
    );
    expect(organization.effectiveBrandColors?.primary).toBe('#112233');

    const chosen = organization.updateProfile({ brandColors: colors }, updated);
    expect(chosen.effectiveBrandColors?.primary).toBe('#5B3A29');
    expect(chosen.logoTraits).toEqual(traits);

    const reset = chosen.updateProfile({ brandColors: null }, new Date(updated.getTime() + 1));
    expect(reset.brandColors).toBeNull();
    expect(reset.effectiveBrandColors?.primary).toBe('#112233');
  });

  it('drops the logo traits when the logo changes or is removed', () => {
    const organization = Organization.restore(
      id,
      { name: 'Empresa', logoAssetId: logo },
      created,
      created,
      traits,
    );
    expect(organization.updateProfile({ logoAssetId: otherLogo }, updated).logoTraits).toBeNull();
    expect(organization.updateProfile({ logoAssetId: null }, updated).logoTraits).toBeNull();
    expect(Organization.restore(id, { name: 'Empresa' }, created, created, traits).logoTraits).toBe(
      null,
    );
  });

  it('keeps the brand voice: typography, visual style, contact, legal text and forbidden words', () => {
    const organization = Organization.create(
      id,
      {
        name: 'Empresa',
        typography: 'SERIF_ELEGANT',
        visualStyle: [' artesanal ', 'cálido'],
        contact: { whatsapp: ' +51 999 999 999 ', website: '' },
        defaultLegalText: ' Imágenes referenciales. ',
        forbiddenWords: ['gratis'],
      },
      created,
    );
    expect(organization.typography).toBe('SERIF_ELEGANT');
    expect(organization.visualStyle).toEqual(['artesanal', 'cálido']);
    expect(organization.contact).toEqual({
      whatsapp: '+51 999 999 999',
      website: null,
      instagram: null,
      address: null,
    });
    expect(organization.defaultLegalText).toBe('Imágenes referenciales.');
    const cleared = organization.updateProfile(
      { contact: { whatsapp: ' ' }, visualStyle: [], typography: null },
      updated,
    );
    expect([cleared.contact, cleared.visualStyle, cleared.typography]).toEqual([null, [], null]);
    expect(cleared.forbiddenWords).toEqual(['gratis']);
  });

  it.each([
    [{ typography: 'COMIC' }, 'typography'],
    [{ visualStyle: ['a', 'b', 'c', 'd', 'e', 'f'] }, 'visualStyle'],
    [{ visualStyle: ['Cálido', 'cálido'] }, 'visualStyle'],
    [{ forbiddenWords: ['x'.repeat(41)] }, 'forbiddenWords'],
    [{ defaultLegalText: 'x'.repeat(201) }, 'defaultLegalText'],
    [{ contact: { phone: '1' } }, 'contact.phone'],
    [{ contact: { website: 'x'.repeat(101) } }, 'contact.website'],
  ])('rejects an invalid brand voice %j', (input, field) => {
    expect(() =>
      Organization.create(id, { name: 'Empresa', ...(input as object) }, created),
    ).toThrow(expect.objectContaining({ field }) as Error);
  });
});
