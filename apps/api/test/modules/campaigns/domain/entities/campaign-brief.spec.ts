import { Money, Currency } from '#app/domain/value-objects/money';
import { CampaignObjective } from '#app/modules/campaigns/domain/campaign-objective';
import { Campaign } from '#app/modules/campaigns/domain/entities/campaign';
import {
  InvalidCampaignError,
  InvalidCampaignTransitionError,
  InvalidPromotionError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import { GenerationSnapshot } from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import { Promotion } from '#app/modules/campaigns/domain/value-objects/promotion';
import { campaignState } from '../../../../support/campaign-restoration.js';
import {
  CAMPAIGN,
  LATER,
  NOW,
  createInput,
  domainFixture,
  resourcesFixture,
} from '../../../../support/campaign-fakes.js';

const regular = Money.fromMinorUnits(2000, Currency.PEN);
const offer = Money.fromMinorUnits(1500, Currency.PEN);

function draft(changes: Partial<Parameters<typeof Campaign.create>[1]> = {}) {
  return Campaign.create(
    CAMPAIGN,
    { ...createInput(), promotion: null, ...changes },
    new Date(NOW),
  );
}

describe('Campaign brief', () => {
  it('defaults to a promotion without occasion and normalizes the occasion', () => {
    expect(draft()).toMatchObject({ objective: CampaignObjective.PROMOTION, occasion: null });
    const launch = draft({ objective: CampaignObjective.LAUNCH, occasion: ' Navidad ' });
    expect(launch).toMatchObject({ objective: 'LAUNCH', occasion: 'Navidad' });
    expect(draft({ occasion: '   ' }).occasion).toBeNull();
  });

  it.each([
    [{ objective: 'SALE' as CampaignObjective }, 'objective'],
    [{ occasion: 'x'.repeat(61) }, 'occasion'],
    [{ instructions: 'x'.repeat(501) }, 'instructions'],
  ])('rejects %j', (change, field) => {
    expect(() => draft(change)).toThrow(new InvalidCampaignError(field));
  });

  it('keeps the promotion conditions and whether to show the discount', () => {
    const promotion = Promotion.create(regular, offer, null, null, {
      conditions: ' Solo en tienda ',
      showDiscount: true,
    });
    expect(promotion.toSnapshot()).toMatchObject({
      conditions: 'Solo en tienda',
      showDiscount: true,
    });
    expect(() =>
      Promotion.create(regular, offer, null, null, { conditions: 'x'.repeat(121) }),
    ).toThrow(InvalidPromotionError);
  });

  it('edits a draft in a new version and restores it', () => {
    const edited = draft().updateDraft(
      {
        ...createInput(),
        title: 'Otra',
        objective: CampaignObjective.EVENT,
        occasion: 'Aniversario',
        promotion: null,
      },
      new Date(LATER),
    );
    expect(edited).toMatchObject({ title: 'Otra', objective: 'EVENT', version: 1 });
    expect(edited.updatedAt.toISOString()).toBe(LATER);
    expect(Campaign.restore(campaignState(edited)).version).toBe(1);
  });

  it('only edits drafts', () => {
    const { generating } = domainFixture();
    expect(() =>
      generating.updateDraft({ ...createInput(), promotion: null }, new Date(LATER)),
    ).toThrow(InvalidCampaignTransitionError);
  });

  it('freezes the brand kit, the product data, the art direction and the brief', () => {
    const campaign = draft({ objective: CampaignObjective.SEASONAL, occasion: 'Navidad' });
    const data = GenerationSnapshot.capture(resourcesFixture(), campaign.brief).data;
    expect(data).toMatchObject({
      objective: 'SEASONAL',
      occasion: 'Navidad',
      organization: {
        industry: 'Cafetería',
        region: { locale: 'es-PE', timeZone: 'America/Lima' },
        brandColors: { primary: '#5B3A29' },
        forbiddenWords: ['gratis'],
      },
      product: { kind: 'PRODUCT', shortName: 'Prod', photoType: 'STUDIO' },
      template: { design: { format: 'SQUARE', composition: 'PRODUCT_HERO' } },
    });
    // Un snapshot con otro objetivo no corresponde a esta campaña.
    const other = GenerationSnapshot.capture(resourcesFixture(), {
      ...campaign.brief,
      objective: CampaignObjective.EVENT,
    });
    expect(() => campaign.requestGeneration(CAMPAIGN, other, new Date(NOW))).toThrow(
      new InvalidCampaignError('snapshot'),
    );
  });

  it('rejects an invalid design or brand color in the snapshot', () => {
    const resources = resourcesFixture();
    resources.template.design = { format: 'A4' };
    expect(() => GenerationSnapshot.capture(resources, draft().brief)).toThrow(
      new InvalidCampaignError('template.design'),
    );
    const colors = resourcesFixture();
    colors.organization.brandColors = { ...colors.organization.brandColors!, accent: 'red' };
    expect(() => GenerationSnapshot.capture(colors, draft().brief)).toThrow(
      new InvalidCampaignError('brandColors.accent'),
    );
  });
});
