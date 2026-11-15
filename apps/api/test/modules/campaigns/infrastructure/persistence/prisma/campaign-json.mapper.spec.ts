import {
  readGenerationSnapshot,
  readPromotion,
  readPublicationProgress,
} from '#app/modules/campaigns/infrastructure/persistence/prisma/campaign-json.mapper';
import {
  domainFixture,
  ORG,
  CAMPAIGN,
  CONTENT,
  testId,
} from '../../../../../support/campaign-fakes.js';

describe('Stored campaign JSON', () => {
  it('validates and reconstructs a JSON snapshot independently of property order', () => {
    const { snapshot } = domainFixture();
    const data = JSON.parse(JSON.stringify(snapshot.data)) as Record<string, unknown>;
    const reversed = Object.fromEntries(Object.entries(data).reverse());
    expect(readGenerationSnapshot(reversed).equals(snapshot)).toBe(true);
  });
  it('reads snapshots stored before the brand kit, the art direction and the brief', () => {
    const data = domainFixture().snapshot.data;
    const legacy = {
      organization: {
        id: data.organization.id,
        name: data.organization.name,
        description: data.organization.description,
        brandTone: data.organization.brandTone,
        logoAssetId: null,
      },
      product: {
        id: data.product.id,
        organizationId: data.product.organizationId,
        name: data.product.name,
        description: data.product.description,
        regularPrice: data.product.regularPrice,
        imageAssetIds: [...data.product.imageAssetIds],
      },
      template: { ...data.template, design: undefined },
      instructions: data.instructions,
      cta: data.cta,
      promotion: { amountMinor: 1500, currency: 'PEN', startsAt: null, endsAt: null },
    };
    const snapshot = readGenerationSnapshot(JSON.parse(JSON.stringify(legacy))).data;
    expect(snapshot).toMatchObject({
      objective: 'PROMOTION',
      occasion: null,
      organization: { region: { country: 'PE', currency: 'PEN' }, brandColors: null },
      product: { kind: null, keyAttributes: [], photoType: null },
      template: { design: null },
      promotion: { conditions: null, showDiscount: false },
    });
  });
  it.each([null, [], {}, { organization: null }, 'snapshot', 4])(
    'rejects malformed snapshots: %j',
    (value) => {
      expect(() => readGenerationSnapshot(value)).toThrow();
    },
  );
  it('rejects corrupted money, date strings and missing nullable fields', () => {
    const data = domainFixture().snapshot.data;
    expect(() =>
      readGenerationSnapshot({
        ...data,
        product: { ...data.product, regularPrice: { amountMinor: '2000', currency: 'PEN' } },
      }),
    ).toThrow();
    expect(() =>
      readPromotion({ amountMinor: 100, currency: 'PEN', startsAt: null, endsAt: 'invalid' }),
    ).toThrow();
    expect(() => readPromotion({ amountMinor: 100, currency: 'PEN' })).toThrow();
  });
  it('rejects invalid publication statuses and unrelated destinations', () => {
    const entry = {
      publicationId: testId(700),
      organizationId: ORG,
      campaignId: CAMPAIGN,
      approvedContentId: CONTENT,
      socialAccountId: testId(701),
      version: 2,
      status: 'UNKNOWN',
    };
    expect(() => readPublicationProgress([entry], ORG, CAMPAIGN, CONTENT, [testId(701)])).toThrow();
    expect(() =>
      readPublicationProgress([{ ...entry, status: 'PUBLISHED' }], ORG, CAMPAIGN, CONTENT, [
        testId(702),
      ]),
    ).toThrow();
  });
});
