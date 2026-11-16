import { entityId, type EntityId } from '#app/domain/entity-id';
import type { Pagination, Page } from '#app/domain/pagination';
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
  type CampaignBrief,
  type GenerationResources,
} from '#app/modules/campaigns/domain/value-objects/generation-snapshot';
import { CampaignObjective } from '#app/modules/campaigns/domain/campaign-objective';
import { DEFAULT_FLYER_DESIGN } from '#app/domain/value-objects/flyer-design';
import type { CampaignLookups } from '#app/modules/campaigns/application/ports/campaign-lookups';
import type {
  CampaignRepository,
  CampaignVersion,
} from '#app/modules/campaigns/domain/repositories/campaign.repository';
import { ConcurrentCampaignModificationError } from '#app/modules/campaigns/domain/errors/campaign.errors';
import { CreateCampaign } from '#app/modules/campaigns/application/use-cases/create-campaign';
import { RequestCampaignGeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-generation';
import { RequestCampaignRegeneration } from '#app/modules/campaigns/application/use-cases/request-campaign-regeneration';
import { RecordGeneratedCampaign } from '#app/modules/campaigns/application/use-cases/record-generated-campaign';
import { ApproveCampaign } from '#app/modules/campaigns/application/use-cases/approve-campaign';
import { UpdateCampaignDraft } from '#app/modules/campaigns/application/use-cases/update-campaign-draft';
import { finalAssetsFake } from './final-assets-fake.js';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import { PublishedCampaignGenerations } from '#app/modules/campaigns/application/published-campaign-generations';
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
      industry: 'Cafetería',
      region: { country: 'PE', locale: 'es-PE', timeZone: 'America/Lima', currency: 'PEN' },
      brandColors: {
        primary: '#5B3A29',
        secondary: '#C98B4E',
        accent: '#E4572E',
        lightBackground: '#F7F1E8',
        darkBackground: '#1E120D',
      },
      typography: 'SERIF_ELEGANT',
      visualStyle: ['artesanal'],
      contact: { whatsapp: '+51 999 999 999', website: null, instagram: null, address: null },
      defaultLegalText: 'Imágenes referenciales.',
      forbiddenWords: ['gratis'],
      audience: null,
      valueProps: [],
      emojiStyle: 'FEW',
      addressForm: 'TU',
      copyExamples: [],
      logoAssetId: null,
      darkBackgroundLogoAssetId: null,
      iconAssetId: null,
      logoIsDark: null,
    },
    product: {
      id: PRODUCT,
      organizationId: ORG,
      kind: 'PRODUCT',
      name: 'Producto',
      shortName: 'Prod',
      productBrand: null,
      description: 'Descripción',
      keyAttributes: ['100 % arábica'],
      unit: null,
      benefits: [],
      idealFor: null,
      regularPrice: { amountMinor: 2000, currency: Currency.PEN },
      imageAssetIds: [ASSET],
      photoType: 'STUDIO',
      hasTransparency: false,
    },
    template: {
      id: TEMPLATE,
      organizationId: ORG,
      revisionId: TEMPLATE_REVISION,
      revisionNumber: 1,
      width: 1080,
      height: 1080,
      design: DEFAULT_FLYER_DESIGN,
    },
  };
}

/** El brief de una campaña con el objetivo por defecto y sin ocasión. */
export function briefOf(
  instructions: string,
  cta: string,
  promotion: Promotion | null,
): CampaignBrief {
  return { objective: CampaignObjective.PROMOTION, occasion: null, instructions, cta, promotion };
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
    briefOf(draft.instructions, draft.cta, promotion),
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
  list(organizationId: EntityId, { page, limit }: Pagination): Promise<Page<Campaign>> {
    const rows = [...this.records.values()]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    return Promise.resolve({
      total: rows.length,
      items: rows.slice((page - 1) * limit, page * limit),
    });
  }
  readonly records = new Map<EntityId, Campaign>();
  readonly contents = new Map<EntityId, GeneratedContent>();
  readonly generations = new Map<
    EntityId,
    { campaignId: EntityId; operation: GenerationOperation }
  >();
  readonly failures = new Map<EntityId, CampaignVersion['failure']>();
  saveCount = 0;

  listVersions(organizationId: EntityId, campaignId: EntityId): Promise<CampaignVersion[]> {
    if (this.records.get(campaignId)?.organizationId !== organizationId) return Promise.resolve([]);
    const contents = [...this.contents.values()];
    return Promise.resolve(
      [...this.generations.values()]
        .filter((item) => item.campaignId === campaignId)
        .map(({ operation }) => ({
          generation: operation,
          content: contents.find((item) => item.generationId === operation.id) ?? null,
          failure: this.failures.get(operation.id) ?? null,
        }))
        .sort((a, b) => b.generation.number - a.generation.number),
    );
  }

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

  saveDraft(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void> {
    const stored = this.records.get(campaign.id);
    if (
      !stored ||
      stored.organizationId !== organizationId ||
      stored.version !== expectedVersion ||
      stored.status !== campaign.status
    )
      throw new ConcurrentCampaignModificationError();
    if (campaign.version !== expectedVersion + 1) throw new TypeError('Invalid test version.');
    this.records.set(campaign.id, campaign);
    this.saveCount++;
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
    if (generation && campaign.generationFailure)
      this.failures.set(generation.id, campaign.generationFailure);
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
    approve: new ApproveCampaign(repository, clock, finalAssetsFake),
    fail: new RecordCampaignGenerationFailure(repository, clock),
    updateDraft: new UpdateCampaignDraft(repository, lookups, clock),
  };
}

// Las suites unitarias no tienen base de datos, así que no hay transacción en la que participar.
export const NO_TRANSACTION = {} as TransactionContext;

// El contrato publicado real de campaigns sobre el repositorio en memoria.
export function campaignGenerationsFake(
  repository: CampaignRepositoryFake,
  lookups: CampaignLookups = new CampaignLookupsFake(),
  ids: IdGenerator = new CampaignIdsFake(),
  clock: Clock = new CampaignClockFake(),
) {
  return new PublishedCampaignGenerations(
    repository,
    lookups,
    {
      repositoryIn: () => repository,
      lock: (generation, _transaction, expectedVersion) => {
        const campaign = repository.records.get(generation.campaignId);
        return Promise.resolve(
          campaign !== undefined &&
            campaign.organizationId === generation.organizationId &&
            campaign.generation?.id === generation.generationId &&
            campaign.status === 'GENERATING' &&
            (expectedVersion === undefined || campaign.version === expectedVersion),
        );
      },
    },
    ids,
    clock,
  );
}
