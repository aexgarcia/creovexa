import { Campaign } from '../../domain/entities/campaign.js';
import { CampaignStatus } from '../../domain/campaign-status.js';
import {
  InvalidCampaignError,
  InvalidPromotionError,
  PromotionExpiredError,
} from '../../domain/errors/campaign.errors.js';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import {
  CampaignResource,
  CampaignResourceNotFoundError,
} from '../errors/campaign-resource-not-found.error.js';
import {
  campaignUseCases,
  createInput,
  ORG,
  OTHER_ORG,
  CAMPAIGN,
  NOW,
  EXPIRES,
  testId,
} from '../../../../../test/support/campaign-fakes.js';

describe('CreateCampaign', () => {
  it('creates a draft with explicit commercial references and returns detached data', async () => {
    const { create, repository } = campaignUseCases();
    const input = createInput();
    const result = await create.execute(input);
    expect(result).toMatchObject({
      id: CAMPAIGN,
      organizationId: ORG,
      title: 'Campaña',
      productId: input.productId,
      templateId: input.templateId,
      templateRevisionId: input.templateRevisionId,
      instructions: input.instructions,
      cta: input.cta,
      status: CampaignStatus.DRAFT,
      generation: null,
      candidateContent: null,
      approvedContentId: null,
      generationFailure: null,
      version: 0,
      createdAt: NOW,
      updatedAt: NOW,
      promotion: { amountMinor: 1500, currency: 'PEN', startsAt: null, endsAt: EXPIRES },
    });
    expect(repository.records.get(CAMPAIGN)).toBeInstanceOf(Campaign);
    expect(result).not.toBeInstanceOf(Campaign);
    input.promotion.endsAt.setUTCFullYear(2000);
    result.promotion!.amountMinor = 1;
    expect(repository.records.get(CAMPAIGN)!.promotion!.toSnapshot()).toMatchObject({
      amountMinor: 1500,
      endsAt: EXPIRES,
    });
    expect(repository.generations.size).toBe(0);
  });

  it('allows a campaign without a discount or additional instructions', async () => {
    const { create } = campaignUseCases();
    const result = await create.execute({
      ...createInput(),
      promotion: null,
      instructions: undefined,
    });
    expect(result.promotion).toBeNull();
    expect(result.instructions).toBe('');
  });

  it.each([
    { changes: { organizationId: OTHER_ORG }, resource: CampaignResource.ORGANIZATION },
    { changes: { productId: testId(50) }, resource: CampaignResource.PRODUCT },
    { changes: { templateRevisionId: testId(50) }, resource: CampaignResource.TEMPLATE_REVISION },
  ])('rejects a missing resource: $resource', async ({ changes, resource }) => {
    const { create, repository } = campaignUseCases();
    await expect(create.execute({ ...createInput(), ...changes })).rejects.toEqual(
      new CampaignResourceNotFoundError(resource),
    );
    expect(repository.records.size).toBe(0);
  });

  it.each(['organization', 'product', 'template'] as const)(
    'checks ownership and identity even if the %s lookup returns unrelated data',
    async (resource) => {
      const { create, lookups, repository } = campaignUseCases();
      if (resource === 'organization')
        lookups.organizations.findById = () =>
          Promise.resolve({ ...lookups.data.organization, id: OTHER_ORG });
      if (resource === 'product')
        lookups.products.findById = () =>
          Promise.resolve({ ...lookups.data.product, organizationId: OTHER_ORG });
      if (resource === 'template')
        lookups.templates.findRevision = () =>
          Promise.resolve({ ...lookups.data.template, revisionId: testId(50) });
      await expect(create.execute(createInput())).rejects.toThrow(CampaignResourceNotFoundError);
      expect(repository.records.size).toBe(0);
    },
  );

  it.each([
    { changes: { title: ' ' }, error: InvalidCampaignError },
    { changes: { organizationId: 'invalid' }, error: InvalidEntityIdError },
    {
      changes: { promotion: { amountMinor: 2000, currency: 'PEN' } },
      error: InvalidPromotionError,
    },
    {
      changes: { promotion: { amountMinor: 1500, currency: 'USD' } },
      error: InvalidPromotionError,
    },
    {
      changes: { promotion: { amountMinor: 1500, currency: 'PEN', endsAt: new Date(NOW) } },
      error: PromotionExpiredError,
    },
  ])('does not store invalid campaign input: %j', async ({ changes, error }) => {
    const { create, repository } = campaignUseCases();
    await expect(create.execute({ ...createInput(), ...changes })).rejects.toThrow(error);
    expect(repository.records.size).toBe(0);
  });

  it.each(['lookup', 'repository'] as const)(
    'propagates a %s failure without returning a created campaign',
    async (dependency) => {
      const { create, lookups, repository } = campaignUseCases();
      const failure = new Error('Unavailable');
      if (dependency === 'lookup') lookups.products.findById = () => Promise.reject(failure);
      else repository.add = () => Promise.reject(failure);
      await expect(create.execute(createInput())).rejects.toBe(failure);
      expect(repository.records.size).toBe(0);
    },
  );
});
