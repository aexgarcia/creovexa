import { Organization } from '#app/modules/organizations/domain/entities/organization';
import { OrganizationMapper } from '#app/modules/organizations/infrastructure/persistence/prisma/organization.mapper';
import { InvalidTimestampError } from '#app/domain/timestamp';
import { InvalidOrganizationProfileError } from '#app/modules/organizations/domain/errors/organization.errors';
import {
  ORGANIZATION_ID,
  CREATED_AT,
  UPDATED_AT,
  ASSET_ID,
} from '../../../../../support/commercial-fakes.js';

describe('OrganizationMapper', () => {
  it('restores the profile and original dates without replaying a business update', () => {
    const entity = Organization.create(
      ORGANIZATION_ID,
      { name: 'Empresa', logoAssetId: ASSET_ID },
      new Date(CREATED_AT),
    ).updateProfile({ brandTone: 'Cercano', description: 'Perfil' }, new Date(UPDATED_AT));
    const row = OrganizationMapper.toPersistence(entity);
    const restored = OrganizationMapper.toDomain(row);
    expect(restored).toBeInstanceOf(Organization);
    expect(OrganizationMapper.toPersistence(restored)).toEqual(row);
    row.createdAt.setUTCFullYear(2000);
    row.updatedAt.setUTCFullYear(2000);
    expect(restored.createdAt.toISOString()).toBe(CREATED_AT);
    expect(restored.updatedAt.toISOString()).toBe(UPDATED_AT);
  });

  it('still validates restored data and chronological order', () => {
    const row = OrganizationMapper.toPersistence(
      Organization.create(ORGANIZATION_ID, { name: 'Empresa' }, new Date(CREATED_AT)),
    );
    expect(() => OrganizationMapper.toDomain({ ...row, name: '' })).toThrow(
      InvalidOrganizationProfileError,
    );
    expect(() =>
      OrganizationMapper.toDomain({ ...row, updatedAt: new Date('2000-01-01') }),
    ).toThrow(InvalidTimestampError);
  });
});

describe('OrganizationMapper brand kit', () => {
  const colors = {
    primary: '#5B3A29',
    secondary: '#C98B4E',
    accent: '#E4572E',
    lightBackground: '#F7F1E8',
    darkBackground: '#1E120D',
  };
  const row = () =>
    OrganizationMapper.toPersistence(
      Organization.create(
        ORGANIZATION_ID,
        { name: 'Empresa', industry: 'Cafetería', brandColors: colors, logoAssetId: ASSET_ID },
        new Date(CREATED_AT),
      ),
    );

  it('keeps the industry, region and colors through persistence', () => {
    const restored = OrganizationMapper.toDomain(row());
    expect(OrganizationMapper.toPersistence(restored)).toEqual(row());
    expect(row()).toMatchObject({ country: 'PE', locale: 'es-PE', defaultCurrency: 'PEN' });
  });

  it('reads the current logo traits and ignores logos uploaded before the analysis', () => {
    const withTraits = OrganizationMapper.toDomain(row(), {
      isDark: false,
      suggestedColors: colors,
    });
    expect(withTraits.logoTraits).toEqual({ isDark: false, suggestedColors: colors });
    expect(
      OrganizationMapper.toDomain(row(), { isDark: null, suggestedColors: null }).logoTraits,
    ).toBeNull();
  });

  it('rejects stored colors that are not valid hexadecimal', () => {
    expect(() =>
      OrganizationMapper.toDomain({ ...row(), brandColors: { ...colors, accent: 'red' } }),
    ).toThrow(InvalidOrganizationProfileError);
    expect(() =>
      OrganizationMapper.toDomain(row(), {
        isDark: true,
        suggestedColors: { ...colors, primary: '#12' },
      }),
    ).toThrow(InvalidOrganizationProfileError);
  });
});
