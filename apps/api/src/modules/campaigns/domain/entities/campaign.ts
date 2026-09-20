import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { CampaignStatus, GenerationFailureCode } from '../campaign-status.js';
import {
  InvalidCampaignError,
  InvalidCampaignTransitionError,
  StaleGenerationResultError,
  ContentRevisionMismatchError,
  ConflictingGenerationResultError,
} from '../errors/campaign.errors.js';
import { GenerationSnapshot } from '../value-objects/generation-snapshot.js';
import { Promotion } from '../value-objects/promotion.js';
import { GeneratedContent } from './generated-content.js';

export interface CampaignDetails {
  title: string;
  organizationId: string;
  productId: string;
  templateId: string;
  templateRevisionId: string;
  instructions?: string;
  cta: string;
  promotion?: Promotion | null;
}

export interface GenerationOperation {
  readonly id: EntityId;
  readonly number: number;
  readonly snapshot: GenerationSnapshot;
  readonly requestedAt: number;
}

interface CampaignState {
  id: EntityId;
  title: string;
  organizationId: EntityId;
  productId: EntityId;
  templateId: EntityId;
  templateRevisionId: EntityId;
  instructions: string;
  cta: string;
  promotion: Promotion | null;
  status: CampaignStatus;
  generation: GenerationOperation | null;
  candidateContent: GeneratedContent | null;
  approvedContentId: EntityId | null;
  generationFailure: GenerationFailureCode | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

function text(value: string, field: string, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()))
    throw new InvalidCampaignError(field);
  return value.trim();
}

export class Campaign {
  readonly #state: Readonly<CampaignState>;
  private constructor(state: CampaignState) {
    this.#state = Object.freeze(state);
  }

  static create(id: string, input: CampaignDetails, at: Date): Campaign {
    const createdAt = timestamp(at);
    const promotion = input.promotion ?? null;
    if (promotion !== null && !(promotion instanceof Promotion))
      throw new InvalidCampaignError('promotion');
    promotion?.assertNotExpired(at);
    return new Campaign({
      id: entityId(id, 'campaignId'),
      title: text(input.title, 'title'),
      organizationId: entityId(input.organizationId, 'organizationId'),
      productId: entityId(input.productId, 'productId'),
      templateId: entityId(input.templateId, 'templateId'),
      templateRevisionId: entityId(input.templateRevisionId, 'templateRevisionId'),
      instructions: text(
        input.instructions === undefined ? '' : input.instructions,
        'instructions',
        false,
      ),
      cta: text(input.cta, 'cta'),
      promotion,
      status: CampaignStatus.DRAFT,
      generation: null,
      candidateContent: null,
      approvedContentId: null,
      generationFailure: null,
      version: 0,
      createdAt,
      updatedAt: createdAt,
    });
  }

  requestGeneration(id: string, snapshot: GenerationSnapshot, at: Date): Campaign {
    if (![CampaignStatus.DRAFT, CampaignStatus.FAILED].includes(this.status)) {
      throw new InvalidCampaignTransitionError();
    }
    return this.beginGeneration(id, snapshot, at);
  }

  requestRegeneration(id: string, snapshot: GenerationSnapshot, at: Date): Campaign {
    if (![CampaignStatus.PENDING_APPROVAL, CampaignStatus.APPROVED].includes(this.status)) {
      throw new InvalidCampaignTransitionError();
    }
    return this.beginGeneration(id, snapshot, at);
  }

  requireGeneration(id: string): GenerationOperation {
    const generationId = entityId(id, 'generationId');
    if (!this.generation || this.generation.id !== generationId)
      throw new StaleGenerationResultError();
    return this.generation;
  }

  recordGeneratedContent(content: GeneratedContent, at: Date): Campaign {
    const generation = this.requireGeneration(content.generationId);
    if (
      content.organizationId !== this.organizationId ||
      content.campaignId !== this.id ||
      content.revision !== generation.number ||
      !content.snapshot.equals(generation.snapshot)
    ) {
      throw new ContentRevisionMismatchError();
    }
    timestamp(content.createdAt, generation.requestedAt);
    if (this.candidateContent !== null) {
      if (this.candidateContent.sameResult(content)) return this;
      throw new ConflictingGenerationResultError();
    }
    if (this.status !== CampaignStatus.GENERATING) throw new InvalidCampaignTransitionError();
    timestamp(at, content.createdAt.getTime());
    return this.change({ status: CampaignStatus.PENDING_APPROVAL, candidateContent: content }, at);
  }

  approve(contentId: string, at: Date): Campaign {
    if (this.status !== CampaignStatus.PENDING_APPROVAL) throw new InvalidCampaignTransitionError();
    const approvedContentId = entityId(contentId, 'contentId');
    if (!this.candidateContent || this.candidateContent.id !== approvedContentId) {
      throw new ContentRevisionMismatchError();
    }
    this.promotion?.assertNotExpired(at);
    return this.change({ status: CampaignStatus.APPROVED, approvedContentId }, at);
  }

  recordGenerationFailure(id: string, code: GenerationFailureCode, at: Date): Campaign {
    this.requireGeneration(id);
    if (!Object.values(GenerationFailureCode).includes(code))
      throw new InvalidCampaignError('generationFailure');
    if (this.status === CampaignStatus.FAILED) {
      if (this.generationFailure === code) return this;
      throw new ConflictingGenerationResultError();
    }
    if (this.status !== CampaignStatus.GENERATING) throw new InvalidCampaignTransitionError();
    return this.change({ status: CampaignStatus.FAILED, generationFailure: code }, at);
  }

  private beginGeneration(id: string, snapshot: GenerationSnapshot, at: Date): Campaign {
    const generationId = entityId(id, 'generationId');
    if (this.generation?.id === generationId) throw new InvalidCampaignError('generationId');
    const number = (this.generation?.number ?? 0) + 1;
    if (!Number.isSafeInteger(number)) throw new InvalidCampaignError('generationNumber');
    if (!(snapshot instanceof GenerationSnapshot)) throw new InvalidCampaignError('snapshot');
    const data = snapshot.data;
    if (
      data.organization.id !== this.organizationId ||
      data.product.id !== this.productId ||
      data.template.id !== this.templateId ||
      data.template.revisionId !== this.templateRevisionId ||
      data.cta !== this.cta ||
      data.instructions !== this.instructions ||
      JSON.stringify(data.promotion) !== JSON.stringify(this.promotion?.toSnapshot() ?? null)
    ) {
      throw new InvalidCampaignError('snapshot');
    }
    this.promotion?.assertNotExpired(at);
    const requestedAt = timestamp(at, this.#state.updatedAt);
    return this.change(
      {
        status: CampaignStatus.GENERATING,
        generation: Object.freeze({ id: generationId, number, snapshot, requestedAt }),
        candidateContent: null,
        approvedContentId: null,
        generationFailure: null,
      },
      at,
    );
  }

  private change(changes: Partial<CampaignState>, at: Date): Campaign {
    const version = this.version + 1;
    if (!Number.isSafeInteger(version)) throw new InvalidCampaignError('version');
    return new Campaign({
      ...this.#state,
      ...changes,
      version,
      updatedAt: timestamp(at, this.#state.updatedAt),
    });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get title(): string {
    return this.#state.title;
  }
  get organizationId(): EntityId {
    return this.#state.organizationId;
  }
  get productId(): EntityId {
    return this.#state.productId;
  }
  get templateId(): EntityId {
    return this.#state.templateId;
  }
  get templateRevisionId(): EntityId {
    return this.#state.templateRevisionId;
  }
  get instructions(): string {
    return this.#state.instructions;
  }
  get cta(): string {
    return this.#state.cta;
  }
  get promotion(): Promotion | null {
    return this.#state.promotion;
  }
  get status(): CampaignStatus {
    return this.#state.status;
  }
  get generation(): GenerationOperation | null {
    return this.#state.generation;
  }
  get candidateContent(): GeneratedContent | null {
    return this.#state.candidateContent;
  }
  get approvedContentId(): EntityId | null {
    return this.#state.approvedContentId;
  }
  get generationFailure(): GenerationFailureCode | null {
    return this.#state.generationFailure;
  }
  get version(): number {
    return this.#state.version;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
