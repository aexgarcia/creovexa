import { InvalidCampaignError, InvalidPromotionError } from '../errors/campaign.errors.js';
import { GenerationSnapshot } from './generation-snapshot.js';
import {
  resourcesFixture,
  domainFixture,
  OTHER_ORG,
  ASSET,
} from '../../../../../test/support/campaign-fakes.js';

describe('GenerationSnapshot', () => {
  it('copies and freezes commercial data, brand and pinned template revision', () => {
    const resources = resourcesFixture();
    const { promotion } = domainFixture();
    const snapshot = GenerationSnapshot.capture(
      resources,
      ' Instrucciones ',
      'Comprar ahora',
      promotion,
    );
    resources.organization.name = 'Otra empresa';
    resources.product.regularPrice.amountMinor = 1;
    resources.product.imageAssetIds = [];
    resources.template.revisionNumber = 20;

    expect(snapshot.data.organization.name).toBe('Empresa');
    expect(snapshot.data.product.regularPrice.amountMinor).toBe(2000);
    expect(snapshot.data.product.imageAssetIds).toEqual([ASSET]);
    expect(snapshot.data.template.revisionNumber).toBe(1);
    expect(snapshot.data.instructions).toBe('Instrucciones');
    expect(snapshot.data.promotion?.amountMinor).toBe(1500);
    expect(() => Object.assign(snapshot.data.product.regularPrice, { amountMinor: 1 })).toThrow(
      TypeError,
    );
    expect(() => Object.assign(snapshot.data.product.imageAssetIds, { 0: OTHER_ORG })).toThrow(
      TypeError,
    );
    expect(() => Object.assign(snapshot.data.promotion!, { amountMinor: 1 })).toThrow(TypeError);
  });

  it.each(['product', 'template'] as const)(
    'rejects a %s from another organization',
    (resource) => {
      const resources = resourcesFixture();
      resources[resource].organizationId = OTHER_ORG;
      expect(() => GenerationSnapshot.capture(resources, '', 'Comprar ahora', null)).toThrow(
        InvalidCampaignError,
      );
    },
  );

  it('revalidates prices and duplicate asset references at the boundary', () => {
    const resources = resourcesFixture();
    const { promotion } = domainFixture();
    resources.product.regularPrice.amountMinor = 1000;
    expect(() => GenerationSnapshot.capture(resources, '', 'Comprar ahora', promotion)).toThrow(
      InvalidPromotionError,
    );
    resources.product.imageAssetIds = [ASSET, ASSET];
    expect(() => GenerationSnapshot.capture(resources, '', 'Comprar ahora', null)).toThrow(
      InvalidCampaignError,
    );
  });

  it('compares actual captured values rather than object identities', () => {
    const first = GenerationSnapshot.capture(resourcesFixture(), '', 'Comprar ahora', null);
    const second = GenerationSnapshot.capture(resourcesFixture(), '', 'Comprar ahora', null);
    expect(first.equals(second)).toBe(true);
    const changed = resourcesFixture();
    changed.product.name = 'Producto actualizado';
    expect(first.equals(GenerationSnapshot.capture(changed, '', 'Comprar ahora', null))).toBe(
      false,
    );
  });
});
