import { SaveOrganizationLogo } from '#app/modules/organizations/application/use-cases/save-organization-logo';
import { GetOrganizationLogo } from '#app/modules/organizations/application/use-cases/get-organization-logo';
import { Organization } from '#app/modules/organizations/domain/entities/organization';
import { OrganizationNotFoundError } from '#app/modules/organizations/domain/errors/organization.errors';
import { OrganizationLogoError } from '#app/modules/organizations/application/errors/organization-logo.error';
import type { OrganizationLogos } from '#app/modules/organizations/application/ports/organization-logos';
import {
  OrganizationRepositoryFake,
  ORGANIZATION_ID,
  OTHER_ORGANIZATION_ID,
  ASSET_ID,
  creationClock,
} from '../../../../support/commercial-fakes.js';

function fixture() {
  const organizations = new OrganizationRepositoryFake();
  organizations.records.set(
    ORGANIZATION_ID,
    Organization.create(ORGANIZATION_ID, { name: 'Marca' }, creationClock.now()),
  );
  const logos: OrganizationLogos = {
    save: vi.fn(async (input) => {
      const current = organizations.records.get(input.organizationId)!;
      organizations.records.set(
        input.organizationId,
        current.updateProfile({ logoAssetId: input.assetId }, input.at),
      );
    }),
    read: vi.fn(async () => null),
  };
  return {
    organizations,
    logos,
    save: new SaveOrganizationLogo(organizations, logos, { next: () => ASSET_ID }, creationClock),
  };
}
describe('Organization logos', () => {
  it('saves one reference with a monotonic revision, preserving profile data', async () => {
    const f = fixture();
    const result = await f.save.execute({
      organizationId: ORGANIZATION_ID,
      bytes: new Uint8Array([1]),
    });
    expect(result).toMatchObject({
      name: 'Marca',
      logoAssetId: ASSET_ID,
      updatedAt: '2026-09-17T12:00:00.001Z',
    });
    expect(f.logos.save).toHaveBeenCalledOnce();
    expect(f.logos.save).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORGANIZATION_ID,
        expectedUpdatedAt: creationClock.now(),
      }),
    );
  });
  it('checks ownership before file validation or external writes', async () => {
    const f = fixture();
    await expect(
      f.save.execute({ organizationId: OTHER_ORGANIZATION_ID, bytes: new Uint8Array() }),
    ).rejects.toThrow(OrganizationNotFoundError);
    expect(f.logos.save).not.toHaveBeenCalled();
  });
  it.each([
    ['INVALID_IMAGE', new Uint8Array()],
    ['TOO_LARGE', new Uint8Array(10 * 1024 * 1024 + 1)],
  ] as const)('rejects %s before storage', async (code, bytes) => {
    const f = fixture();
    await expect(f.save.execute({ organizationId: ORGANIZATION_ID, bytes })).rejects.toMatchObject({
      code,
    });
    expect(f.logos.save).not.toHaveBeenCalled();
    expect(f.organizations.records.get(ORGANIZATION_ID)?.logoAssetId).toBeNull();
  });
  it('preserves the previous reference when storage fails', async () => {
    const f = fixture();
    f.logos.save = vi.fn(async () => {
      throw new OrganizationLogoError('UNAVAILABLE');
    });
    await expect(
      f.save.execute({ organizationId: ORGANIZATION_ID, bytes: new Uint8Array([1]) }),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(f.organizations.records.get(ORGANIZATION_ID)?.logoAssetId).toBeNull();
  });
  it('does not disclose a missing or foreign logo', async () => {
    const f = fixture();
    await expect(
      new GetOrganizationLogo(f.logos).execute({
        organizationId: OTHER_ORGANIZATION_ID,
        assetId: ASSET_ID,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(f.logos.read).toHaveBeenCalledWith({
      organizationId: OTHER_ORGANIZATION_ID,
      assetId: ASSET_ID,
    });
  });
});
