import { Currency } from '#app/domain/value-objects/money';
import {
  ConcurrentCampaignModificationError,
  InvalidCampaignTransitionError,
  InvalidPromotionError,
} from '#app/modules/campaigns/domain/errors/campaign.errors';
import {
  CampaignResource,
  CampaignResourceNotFoundError,
} from '#app/modules/campaigns/application/errors/campaign-resource-not-found.error';
import {
  CAMPAIGN,
  LATER,
  campaignUseCases,
  createInput,
  testId,
} from '../../../../support/campaign-fakes.js';

async function created() {
  const useCases = campaignUseCases();
  await useCases.create.execute(createInput());
  useCases.clock.value = LATER;
  return useCases;
}

describe('UpdateCampaignDraft', () => {
  it('replaces the whole brief of a draft', async () => {
    const { updateDraft, repository } = await created();
    const result = await updateDraft.execute({
      ...createInput(),
      campaignId: CAMPAIGN,
      expectedVersion: 0,
      title: 'Promo de verano',
      objective: 'SEASONAL' as never,
      occasion: 'Verano',
      promotion: {
        amountMinor: 1200,
        currency: Currency.PEN,
        conditions: 'Hasta agotar stock',
        showDiscount: true,
      },
    });
    expect(result).toMatchObject({
      title: 'Promo de verano',
      objective: 'SEASONAL',
      occasion: 'Verano',
      version: 1,
      updatedAt: LATER,
      promotion: {
        amountMinor: 1200,
        conditions: 'Hasta agotar stock',
        showDiscount: true,
        endsAt: null,
      },
    });
    expect(repository.records.get(CAMPAIGN)?.version).toBe(1);
  });

  it('rejects an outdated version without saving', async () => {
    const { updateDraft, repository } = await created();
    await expect(
      updateDraft.execute({ ...createInput(), campaignId: CAMPAIGN, expectedVersion: 3 }),
    ).rejects.toThrow(ConcurrentCampaignModificationError);
    expect(repository.records.get(CAMPAIGN)?.version).toBe(0);
  });

  it('validates the promotion against the chosen product and checks references', async () => {
    const { updateDraft } = await created();
    const input = { ...createInput(), campaignId: CAMPAIGN, expectedVersion: 0 };
    await expect(
      updateDraft.execute({
        ...input,
        promotion: { amountMinor: 2500, currency: Currency.PEN },
      }),
    ).rejects.toThrow(InvalidPromotionError);
    await expect(updateDraft.execute({ ...input, productId: testId(999) })).rejects.toEqual(
      new CampaignResourceNotFoundError(CampaignResource.PRODUCT),
    );
  });

  it('does not edit a campaign that already started generating', async () => {
    const { updateDraft, generate, selection } = await created();
    await generate.execute(selection);
    await expect(
      updateDraft.execute({ ...createInput(), campaignId: CAMPAIGN, expectedVersion: 1 }),
    ).rejects.toThrow(InvalidCampaignTransitionError);
  });
});
