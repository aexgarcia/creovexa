import { Organization } from '../../../domain/entities/organization.js';
import { OrganizationMapper } from './organization.mapper.js';
import { InvalidTimestampError } from '#app/domain/timestamp';
import { InvalidOrganizationProfileError } from '../../../domain/errors/organization.errors.js';
import {
  ORGANIZATION_ID,
  CREATED_AT,
  UPDATED_AT,
  ASSET_ID,
} from '../../../../../../test/support/commercial-fakes.js';

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
