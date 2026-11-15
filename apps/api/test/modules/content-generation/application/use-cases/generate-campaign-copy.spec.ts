import {
  campaignUseCases,
  campaignGenerationsFake,
  createInput,
  OTHER_ORG,
  domainFixture,
  CAMPAIGN,
} from '../../../../support/campaign-fakes.js';
import {
  CopyGenerationError,
  type CopyGenerator,
} from '#app/modules/content-generation/application/ports/copy-generator';
import { CopyRepositoryFake, validCopy } from '../../../../support/generation-fakes.js';
import { GenerateCampaignCopy } from '#app/modules/content-generation/application/use-cases/generate-campaign-copy';
import { CampaignStatus } from '#app/modules/campaigns/domain/campaign-status';
async function fixture() {
  const f = campaignUseCases();
  await f.create.execute(createInput());
  const copies = new CopyRepositoryFake();
  const generate = vi.fn(async (input) => validCopy(input));
  const generator: CopyGenerator = { assertAvailable() {}, generate };
  return {
    ...f,
    copies,
    generate,
    generator,
    useCase: new GenerateCampaignCopy(
      campaignGenerationsFake(f.repository, f.lookups, f.ids, f.clock),
      copies,
      generator,
      f.ids,
      f.clock,
    ),
  };
}
describe('GenerateCampaignCopy', () => {
  it('freezes resources and stores copy without creating an approvable image result', async () => {
    const f = await fixture();
    const result = await f.useCase.execute(f.selection);
    expect(result.cta).toBe('Comprar ahora');
    expect(f.copies.saved).toMatchObject({ headline: 'Producto' });
    const campaign = f.repository.records.get(CAMPAIGN)!;
    expect(campaign.status).toBe(CampaignStatus.GENERATING);
    expect(campaign.candidateContent).toBeNull();
    f.lookups.data.product.name = 'Changed';
    expect(await f.useCase.execute(f.selection)).toEqual(result);
    expect(f.generate).toHaveBeenCalledTimes(1);
  });
  it('does not call the provider for foreign organizations', async () => {
    const f = await fixture();
    await expect(
      f.useCase.execute({ ...f.selection, organizationId: OTHER_ORG }),
    ).rejects.toThrow();
    expect(f.generate).not.toHaveBeenCalled();
  });
  it('rejects busy claims without calling provider', async () => {
    const f = await fixture();
    f.copies.busy = true;
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'BUSY' });
    expect(f.generate).not.toHaveBeenCalled();
  });
  it('rejects invalid output and releases the attempt for retry', async () => {
    const f = await fixture();
    f.generate.mockResolvedValueOnce({ ...validCopy(), caption: 'Envío gratis y descuento 99%' });
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(f.copies.saved).toBeNull();
    expect(f.copies.releases).toBe(1);
    await expect(f.useCase.execute(f.selection)).resolves.toHaveProperty('headline', 'Producto');
  });
  it('does not change draft state if the provider is not configured', async () => {
    const f = await fixture();
    f.generator.assertAvailable = () => {
      throw new CopyGenerationError('UNAVAILABLE');
    };
    await expect(f.useCase.execute(f.selection)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    expect(f.repository.records.get(CAMPAIGN)!.status).toBe(CampaignStatus.DRAFT);
  });
  it('does not generate over an approved campaign', async () => {
    const f = await fixture();
    f.repository.records.set(CAMPAIGN, domainFixture().approved);
    await expect(f.useCase.execute(f.selection)).rejects.toThrow();
    expect(f.generate).not.toHaveBeenCalled();
  });
});
