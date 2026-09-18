import { Organization } from './organization.js';
import { InvalidOrganizationProfileError } from '../errors/organization.errors.js';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import { InvalidTimestampError } from '#app/domain/timestamp';

const id = '11111111-1111-4111-8111-111111111111';
const logo = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const created = new Date('2026-09-17T12:00:00Z');
const updated = new Date('2026-09-17T13:00:00Z');

describe('Organization', () => {
  it('starts with a normalized name and optional brand information', () => {
    const organization = Organization.create(id, { name: '  Creovexa  ' }, created);
    expect(organization.name).toBe('Creovexa');
    expect(organization.description).toBe('');
    expect(organization.brandTone).toBeNull();
    expect(organization.logoAssetId).toBeNull();
    expect(organization.createdAt).toEqual(created);
    expect(organization.updatedAt).toEqual(created);
  });

  it.each(['', '  \n '])('rejects empty business name %j', (name) => {
    expect(() => Organization.create(id, { name }, created)).toThrow(
      InvalidOrganizationProfileError,
    );
  });

  it('preserves identity and creation time when updating the profile', () => {
    const original = Organization.create(
      id,
      {
        name: 'Original',
        description: 'Empresa',
        brandTone: 'Formal',
        logoAssetId: logo,
      },
      created,
    );

    const result = original.updateProfile({ name: ' Nuevo ', brandTone: null }, updated);

    expect(result.id).toBe(id);
    expect(result.name).toBe('Nuevo');
    expect(result.description).toBe('Empresa');
    expect(result.brandTone).toBeNull();
    expect(result.logoAssetId).toBe(logo);
    expect(result.createdAt).toEqual(created);
    expect(result.updatedAt).toEqual(updated);
    expect(original.name).toBe('Original');
    expect(original.brandTone).toBe('Formal');
  });

  it('clears the logo explicitly and keeps omitted values', () => {
    const original = Organization.create(id, { name: 'Empresa', logoAssetId: logo }, created);
    expect(original.updateProfile({}, updated).logoAssetId).toBe(logo);
    expect(original.updateProfile({ logoAssetId: null }, updated).logoAssetId).toBeNull();
  });

  it('does not leave partial changes after an invalid update', () => {
    const organization = Organization.create(
      id,
      { name: 'Original', description: 'Original' },
      created,
    );
    expect(() => organization.updateProfile({ name: '', description: 'Cambio' }, updated)).toThrow(
      InvalidOrganizationProfileError,
    );
    expect(organization.name).toBe('Original');
    expect(organization.description).toBe('Original');
    expect(organization.updatedAt).toEqual(created);
  });

  it('requires stable UUID identifiers for identity and logo assets', () => {
    expect(() => Organization.create('invalid', { name: 'Empresa' }, created)).toThrow(
      InvalidEntityIdError,
    );
    expect(() =>
      Organization.create(id, { name: 'Empresa', logoAssetId: 'https://storage/file' }, created),
    ).toThrow(InvalidEntityIdError);
  });

  it('does not expose mutable timestamps', () => {
    const inputDate = new Date(created);
    const organization = Organization.create(id, { name: 'Empresa' }, inputDate);
    inputDate.setFullYear(2000);
    organization.createdAt.setFullYear(2001);
    organization.updatedAt.setFullYear(2002);
    expect(organization.createdAt).toEqual(created);
    expect(organization.updatedAt).toEqual(created);
  });

  it('rejects invalid dates and updates that move time backwards', () => {
    expect(() => Organization.create(id, { name: 'Empresa' }, new Date(NaN))).toThrow(
      InvalidTimestampError,
    );
    const organization = Organization.create(id, { name: 'Empresa' }, created).updateProfile(
      { name: 'Actualizada' },
      updated,
    );
    expect(() => organization.updateProfile({ name: 'Anterior' }, created)).toThrow(
      InvalidTimestampError,
    );
  });
});
