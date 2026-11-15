import { StaleGenerationResultError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import {
  CAMPAIGN,
  CampaignRepositoryFake,
  GENERATION,
  NEXT_GENERATION,
  NO_TRANSACTION,
  ORG,
  campaignGenerationsFake,
  domainFixture,
  testId,
} from '../../../support/campaign-fakes.js';

function fixture() {
  const domain = domainFixture();
  const repository = new CampaignRepositoryFake();
  repository.records.set(CAMPAIGN, domain.generating);
  const generations = campaignGenerationsFake(repository);
  const reference = { organizationId: ORG, campaignId: CAMPAIGN };
  const record = {
    organizationId: ORG,
    campaignId: CAMPAIGN,
    generationId: GENERATION,
    expectedVersion: domain.generating.version,
    copy: {
      headline: 'Promoción',
      subheadline: 'Solo esta semana',
      caption: 'Texto',
      cta: domain.generating.cta,
      hashtags: ['#Producto'],
    },
    finalAssetId: testId(501),
    at: new Date('2026-09-18T12:30:00.000Z'),
  };
  return { ...domain, repository, generations, reference, record };
}

describe('PublishedCampaignGenerations', () => {
  it('exposes the current generation as plain data, never the aggregate', async () => {
    const f = fixture();
    const view = await f.generations.view(f.reference);
    expect(view).toMatchObject({
      organizationId: ORG,
      campaignId: CAMPAIGN,
      status: 'GENERATING',
      version: f.generating.version,
      candidateContent: null,
    });
    expect(view.generation).toEqual({
      id: GENERATION,
      number: f.generating.generation!.number,
      snapshot: f.generating.generation!.snapshot.data,
    });
  });

  it('rejects a generation that is not the current one', async () => {
    const f = fixture();
    await expect(f.generations.view(f.reference, NEXT_GENERATION)).rejects.toBeInstanceOf(
      StaleGenerationResultError,
    );
  });

  it('reports the lock only for the current generation at the expected version', async () => {
    const f = fixture();
    const generation = { organizationId: ORG, campaignId: CAMPAIGN, generationId: GENERATION };
    expect(await f.generations.lock(generation, NO_TRANSACTION, f.generating.version)).toBe(true);
    expect(await f.generations.lock(generation, NO_TRANSACTION, f.generating.version + 1)).toBe(
      false,
    );
    expect(
      await f.generations.lock({ ...generation, generationId: NEXT_GENERATION }, NO_TRANSACTION),
    ).toBe(false);
  });

  it('records the content and leaves the campaign pending approval', async () => {
    const f = fixture();
    const content = await f.generations.recordContent(f.record, NO_TRANSACTION);
    expect(content).toMatchObject({
      generationId: GENERATION,
      headline: 'Promoción',
      subheadline: 'Solo esta semana',
      assetIds: [testId(501)],
    });
    const saved = f.repository.records.get(CAMPAIGN)!;
    expect(saved.status).toBe('PENDING_APPROVAL');
    expect(saved.candidateContent!.id).toBe(content.id);
    expect(f.repository.saveCount).toBe(1);
  });

  it('does not record content against a campaign that changed meanwhile', async () => {
    const f = fixture();
    await expect(
      f.generations.recordContent(
        { ...f.record, expectedVersion: f.record.expectedVersion + 1 },
        NO_TRANSACTION,
      ),
    ).rejects.toBeInstanceOf(StaleGenerationResultError);
    expect(f.repository.saveCount).toBe(0);
    expect(f.repository.records.get(CAMPAIGN)!.status).toBe('GENERATING');
  });
});
