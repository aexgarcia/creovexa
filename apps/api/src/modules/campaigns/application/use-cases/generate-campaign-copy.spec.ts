import {
  campaignUseCases,
  createInput,
  OTHER_ORG,
  domainFixture,
  CAMPAIGN,
} from '../../../../../test/support/campaign-fakes.js';
import type {
  CampaignCopyRepository,
  CopySelection,
  CopyLease,
} from '../ports/campaign-copy-repository.js';
import {
  CopyGenerationError,
  type CopyGenerator,
  type CampaignCopy,
} from '../ports/copy-generator.js';
import { copyChoices, validateCopy } from '../copy-policy.js';
import { GenerateCampaignCopy } from './generate-campaign-copy.js';
import { CampaignStatus } from '../../domain/campaign-status.js';
function validCopy(input = domainFixture().snapshot.data) {
  const options = copyChoices(input);
  return {
    headline: options.headline[0]!,
    caption: options.caption[0]!,
    cta: options.cta[0]!,
    hashtags: [],
    imagePrompt: options.imagePrompt[0]!,
  };
}
class CopyRepositoryFake implements CampaignCopyRepository {
  saved: CampaignCopy | null = null;
  busy = false;
  releases = 0;
  find(_selection: CopySelection) {
    return Promise.resolve(this.saved);
  }
  claim(_lease: CopyLease) {
    if (this.busy) return Promise.resolve(false);
    this.busy = true;
    return Promise.resolve(true);
  }
  complete(_lease: CopyLease, content: CampaignCopy) {
    this.saved = content;
    return Promise.resolve();
  }
  release(_lease: CopyLease) {
    this.busy = false;
    this.releases++;
    return Promise.resolve();
  }
}
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
    useCase: new GenerateCampaignCopy(f.repository, f.lookups, copies, generator, f.ids, f.clock),
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
describe('copy factual policy', () => {
  it.each([
    { caption: 'Ahora PEN 0.01' },
    { cta: 'CTA diferente' },
    { headline: 'Garantía total' },
    { imagePrompt: 'Producto certificado' },
    { hashtags: ['#Gratis'] },
    { extra: 'ignored' },
  ])('rejects invented or unexpected fields %j', (change) => {
    expect(() =>
      validateCopy({ ...validCopy(), ...change }, domainFixture().snapshot.data),
    ).toThrow(CopyGenerationError);
  });
  it('keeps exact money and dates from snapshot', () => {
    const copy = validCopy();
    expect(copy.caption).toContain('PEN 20.00');
    expect(copy.caption).toContain('PEN 15.00');
    expect(copy.caption).toContain('2026-09-20T00:00:00.000Z');
  });
});
