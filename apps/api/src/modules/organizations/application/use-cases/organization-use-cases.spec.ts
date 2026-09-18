import { CreateOrganization } from './create-organization.js';
import { UpdateOrganizationProfile } from './update-organization-profile.js';
import { Organization } from '../../domain/entities/organization.js';
import {
  InvalidOrganizationProfileError,
  OrganizationNotFoundError,
} from '../../domain/errors/organization.errors.js';
import {
  OrganizationRepositoryFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  CREATED_AT,
  UPDATED_AT,
  ASSET_ID,
  creationClock,
  updateClock,
} from '../../../../../test/support/commercial-fakes.js';

describe('Organization use cases', () => {
  it('creates and stores a valid organization and returns an application result', async () => {
    const repository = new OrganizationRepositoryFake();
    const useCase = new CreateOrganization(
      repository,
      { next: () => ORGANIZATION_ID },
      creationClock,
    );

    const result = await useCase.execute({
      name: ' Empresa ',
      brandTone: 'Cercano',
      logoAssetId: ASSET_ID,
    });

    expect(result).toEqual({
      id: ORGANIZATION_ID,
      name: 'Empresa',
      description: '',
      brandTone: 'Cercano',
      logoAssetId: ASSET_ID,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    });
    expect(repository.records.get(ORGANIZATION_ID)).toBeInstanceOf(Organization);
    expect(result).not.toBeInstanceOf(Organization);
    result.name = 'Cambio externo';
    expect(repository.records.get(ORGANIZATION_ID)?.name).toBe('Empresa');
  });

  it('does not store an invalid profile', async () => {
    const repository = new OrganizationRepositoryFake();
    const useCase = new CreateOrganization(
      repository,
      { next: () => ORGANIZATION_ID },
      creationClock,
    );

    await expect(useCase.execute({ name: ' ' })).rejects.toThrow(InvalidOrganizationProfileError);
    expect(repository.records.size).toBe(0);
  });

  it('updates a profile and preserves fields omitted by the caller', async () => {
    const repository = new OrganizationRepositoryFake();
    await repository.add(
      Organization.create(
        ORGANIZATION_ID,
        {
          name: 'Empresa',
          description: 'Descripción',
          brandTone: 'Formal',
          logoAssetId: ASSET_ID,
        },
        creationClock.now(),
      ),
    );
    const useCase = new UpdateOrganizationProfile(repository, updateClock);

    const result = await useCase.execute({
      organizationId: ORGANIZATION_ID,
      name: 'Nueva empresa',
      logoAssetId: null,
    });

    expect(result).toMatchObject({
      id: ORGANIZATION_ID,
      name: 'Nueva empresa',
      description: 'Descripción',
      brandTone: 'Formal',
      logoAssetId: null,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });
    expect(repository.records.get(ORGANIZATION_ID)?.name).toBe('Nueva empresa');
    expect(repository.saveCount).toBe(1);
  });

  it('reports a missing organization without writing anything', async () => {
    const repository = new OrganizationRepositoryFake();
    const useCase = new UpdateOrganizationProfile(repository, updateClock);

    await expect(
      useCase.execute({ organizationId: ORGANIZATION_ID, name: 'Nueva' }),
    ).rejects.toThrow(OrganizationNotFoundError);
    expect(repository.saveCount).toBe(0);
  });

  it('rejects a repository result belonging to a different organization', async () => {
    const repository = new OrganizationRepositoryFake();
    const other = Organization.create(OTHER_ORGANIZATION_ID, { name: 'Otra' }, creationClock.now());
    repository.findById = () => Promise.resolve(other);
    const useCase = new UpdateOrganizationProfile(repository, updateClock);

    await expect(
      useCase.execute({ organizationId: ORGANIZATION_ID, name: 'Cambio' }),
    ).rejects.toThrow(OrganizationNotFoundError);
    expect(repository.saveCount).toBe(0);
    expect(other.name).toBe('Otra');
  });

  it('does not mutate persisted state when an update fails validation', async () => {
    const repository = new OrganizationRepositoryFake();
    await repository.add(
      Organization.create(
        ORGANIZATION_ID,
        {
          name: 'Empresa',
          description: 'Original',
        },
        creationClock.now(),
      ),
    );
    const useCase = new UpdateOrganizationProfile(repository, updateClock);

    await expect(
      useCase.execute({ organizationId: ORGANIZATION_ID, name: '', description: 'Cambio' }),
    ).rejects.toThrow(InvalidOrganizationProfileError);
    expect(repository.records.get(ORGANIZATION_ID)?.description).toBe('Original');
    expect(repository.saveCount).toBe(0);
  });

  it('propagates storage errors without changing the previously loaded entity', async () => {
    const repository = new OrganizationRepositoryFake();
    await repository.add(
      Organization.create(ORGANIZATION_ID, { name: 'Original' }, creationClock.now()),
    );
    const failure = new Error('Storage unavailable');
    repository.save = () => Promise.reject(failure);
    const useCase = new UpdateOrganizationProfile(repository, updateClock);

    await expect(useCase.execute({ organizationId: ORGANIZATION_ID, name: 'Cambio' })).rejects.toBe(
      failure,
    );
    expect(repository.records.get(ORGANIZATION_ID)?.name).toBe('Original');
  });
});
