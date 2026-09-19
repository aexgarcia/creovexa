import { entityId, type EntityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { Money, Currency } from '#app/domain/value-objects/money';
import {
  Campaign,
  type GenerationOperation,
} from '#app/modules/campaigns/domain/entities/campaign';
import {
  GeneratedContent,
  type GeneratedContentPayload,
} from '#app/modules/campaigns/domain/entities/generated-content';
import { Promotion } from '#app/modules/campaigns/domain/value-objects/promotion';
import {
  GenerationSnapshot,
  type GenerationResources,
} from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import type { CampaignLookups } from '#app/modules/campaigns/application/ports/campaign-lookups';
import type { CampaignRepository } from '#app/modules/campaigns/domain/repositories/campaign.repository';
import { ConcurrentCampaignModificationError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { RequestCampaignRegeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-regeneration';
import { RecordGeneratedCampaign } from '#app/modules/campaigns/application/use-cases/record-generated-campaign';
import { ApproveCampaign } from '#app/modules/campaigns/application/use-cases/approve-campaign';
import { RecordCampaignGenerationFailure } from '#app/modules/campaigns/application/use-cases/record-campaign-generation-failure';
import { GenerationFailureCode } from '#app/modules/campaigns/domain/campaign-status';

export function testId(number: number): EntityId {
  return entityId(`00000000-0000-4000-8000-${number.toString().padStart(12, '0')}`);
}

export const ORG = testId(1);
export const OTHER_ORG = testId(2);
export const PRODUCT = testId(3);
export const TEMPLATE = testId(4);
export const TEMPLATE_REVISION = testId(5);
export const CAMPAIGN = testId(100);
export const GENERATION = testId(101);
export const CONTENT = testId(102);
export const NEXT_GENERATION = testId(103);
export const ASSET = testId(6);
export const NOW = '2026-09-18T12:00:00.000Z';
export const LATER = '2026-09-18T13:00:00.000Z';
export const EXPIRES = '2026-09-20T00:00:00.000Z';

export function resourcesFixture(): GenerationResources {
  return {
    organization: {
      id: ORG,
      name: 'Empresa',
      description: 'Descripción de empresa',
      brandTone: 'Cercano',
      logoAssetId: null,
    },
    product: {
      id: PRODUCT,
      organizationId: ORG,
      name: 'Producto',
      description: 'Descripción',
      regularPrice: { amountMinor: 2000, currency: Currency.PEN },
      imageAssetIds: [ASSET],
    },
    template: {
      id: TEMPLATE,
      organizationId: ORG,
      revisionId: TEMPLATE_REVISION,
      revisionNumber: 1,
      width: 1080,
      height: 1080,
    },
  };
}

export function createInput() {
  return {
    organizationId: ORG,
    productId: PRODUCT,
    templateId: TEMPLATE,
    templateRevisionId: TEMPLATE_REVISION,
    title: ' Campaña ',
    instructions: 'Usar datos exactos',
    cta: 'Comprar ahora',
    promotion: { amountMinor: 1500, currency: Currency.PEN, endsAt: new Date(EXPIRES) },
  };
}

export function payloadFixture(): GeneratedContentPayload {
  return {
    headline: 'Promoción',
    caption: 'Conoce nuestra oferta',
    cta: 'Comprar ahora',
    hashtags: ['#oferta'],
    assetIds: [ASSET],
  };
}

export function domainFixture() {
  const input = createInput();
  const promotion = Promotion.create(
    Money.fromMinorUnits(2000, Currency.PEN),
    Money.fromMinorUnits(1500, Currency.PEN),
    null,
    new Date(EXPIRES),
  );
  const draft = Campaign.create(CAMPAIGN, { ...input, promotion }, new Date(NOW));
  const snapshot = GenerationSnapshot.capture(
    resourcesFixture(),
    draft.instructions,
    draft.cta,
    promotion,
  );
  const generating = draft.requestGeneration(GENERATION, snapshot, new Date(NOW));
  const content = GeneratedContent.create(
    {
      id: CONTENT,
      organizationId: ORG,
      campaignId: CAMPAIGN,
      generationId: GENERATION,
      revision: 1,
    },
    snapshot,
    payloadFixture(),
    new Date(NOW),
  );
  const pending = generating.recordGeneratedContent(content, new Date(NOW));
  const approved = pending.approve(CONTENT, new Date(NOW));
  const failed = generating.recordGenerationFailure(
    GENERATION,
    GenerationFailureCode.TIMEOUT,
    new Date(NOW),
  );
  return { draft, snapshot, generating, content, pending, approved, failed, promotion };
}

export class CampaignClockFake implements Clock {
  value = NOW;
  now(): Date {
    return new Date(this.value);
  }
}

export class CampaignIdsFake implements IdGenerator {
  private number = 100;
  next(): string {
    return testId(this.number++);
  }
}

export class CampaignLookupsFake implements CampaignLookups {
  data = resourcesFixture();
  organizations: CampaignLookups['organizations'] = {
    findById: (id) =>
      Promise.resolve(this.data.organization.id === id ? this.data.organization : null),
  };
  products: CampaignLookups['products'] = {
    findById: (organizationId, id) =>
      Promise.resolve(
        this.data.product.id === id && this.data.product.organizationId === organizationId
          ? this.data.product
          : null,
      ),
  };
  templates: CampaignLookups['templates'] = {
    findRevision: (organizationId, id, revisionId) =>
      Promise.resolve(
        this.data.template.id === id &&
          this.data.template.revisionId === revisionId &&
          this.data.template.organizationId === organizationId
          ? this.data.template
          : null,
      ),
  };
}

export class CampaignRepositoryFake implements CampaignRepository {
  readonly records = new Map<EntityId, Campaign>();
  readonly contents = new Map<EntityId, GeneratedContent>();
  readonly generations = new Map<
    EntityId,
    { campaignId: EntityId; operation: GenerationOperation }
  >();
  saveCount = 0;

  findById(organizationId: EntityId, campaignId: EntityId): Promise<Campaign | null> {
    const campaign = this.records.get(campaignId);
    return Promise.resolve(campaign?.organizationId === organizationId ? campaign : null);
  }

  add(organizationId: EntityId, campaign: Campaign): Promise<void> {
    if (organizationId !== campaign.organizationId || this.records.has(campaign.id))
      throw new TypeError('Invalid test insert.');
    this.records.set(campaign.id, campaign);
    return Promise.resolve();
  }

  save(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void> {
    const stored = this.records.get(campaign.id);
    if (
      !stored ||
      organizationId !== campaign.organizationId ||
      stored.organizationId !== organizationId ||
      stored.version !== expectedVersion
    ) {
      throw new ConcurrentCampaignModificationError();
    }
    if (campaign.version !== expectedVersion + 1) throw new TypeError('Invalid test version.');
    const generation = campaign.generation;
    const previousGeneration = generation ? this.generations.get(generation.id) : undefined;
    if (
      previousGeneration &&
      (previousGeneration.campaignId !== campaign.id ||
        previousGeneration.operation.number !== generation!.number ||
        !previousGeneration.operation.snapshot.equals(generation!.snapshot))
    ) {
      throw new ConcurrentCampaignModificationError();
    }
    const content = campaign.candidateContent;
    if (content) {
      const previous = this.contents.get(content.id);
      const sameGeneration = [...this.contents.values()].find(
        (item) => item.campaignId === campaign.id && item.generationId === content.generationId,
      );
      if (
        (previous && !previous.sameResult(content)) ||
        (sameGeneration && sameGeneration.id !== content.id)
      )
        throw new ConcurrentCampaignModificationError();
    }
    if (generation && !previousGeneration)
      this.generations.set(generation.id, { campaignId: campaign.id, operation: generation });
    if (content && !this.contents.has(content.id)) this.contents.set(content.id, content);
    this.records.set(campaign.id, campaign);
    this.saveCount++;
    return Promise.resolve();
  }
}

export function campaignUseCases() {
  const repository = new CampaignRepositoryFake();
  const lookups = new CampaignLookupsFake();
  const ids = new CampaignIdsFake();
  const clock = new CampaignClockFake();
  return {
    repository,
    lookups,
    ids,
    clock,
    selection: { organizationId: ORG, campaignId: CAMPAIGN },
    create: new CreateCampaign(repository, lookups, ids, clock),
    generate: new RequestCampaignGeneration(repository, lookups, ids, clock),
    regenerate: new RequestCampaignRegeneration(repository, lookups, ids, clock),
    record: new RecordGeneratedCampaign(repository, ids, clock),
    approve: new ApproveCampaign(repository, clock),
    fail: new RecordCampaignGenerationFailure(repository, clock),
  };
}
