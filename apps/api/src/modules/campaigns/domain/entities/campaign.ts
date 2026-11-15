import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import {
  CampaignObjective,
  INSTRUCTIONS_MAX_LENGTH,
  OCCASION_MAX_LENGTH,
} from '../campaign-objective.js';
import {
  CampaignStatus,
  CampaignFailureOrigin,
  GenerationFailureCode,
} from '../campaign-status.js';
import {
  InvalidCampaignError,
  InvalidCampaignTransitionError,
  StaleGenerationResultError,
  ContentRevisionMismatchError,
  ConflictingGenerationResultError,
} from '../errors/campaign.errors.js';
import { GenerationSnapshot, type CampaignBrief } from '../value-objects/generation-snapshot.js';
import { Promotion } from '../value-objects/promotion.js';
import {
  PublicationProgress,
  type CampaignPublication,
} from '../value-objects/publication-progress.js';
import { GeneratedContent } from './generated-content.js';

export interface CampaignDetails {
  title: string;
  organizationId: string;
  productId: string;
  templateId: string;
  templateRevisionId: string;
  objective?: CampaignObjective;
  occasion?: string | null;
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

export interface CampaignState {
  id: EntityId;
  title: string;
  organizationId: EntityId;
  productId: EntityId;
  templateId: EntityId;
  templateRevisionId: EntityId;
  objective: CampaignObjective;
  occasion: string | null;
  instructions: string;
  cta: string;
  promotion: Promotion | null;
  status: CampaignStatus;
  generation: GenerationOperation | null;
  // El número más alto entre todas las generaciones de la campaña; la vigente puede ser una
  // anterior si se recuperó una versión. Al rehidratar, si falta, es el de la vigente.
  lastGenerationNumber?: number;
  candidateContent: GeneratedContent | null;
  approvedContentId: EntityId | null;
  approvedSocialAccountIds: readonly EntityId[];
  publicationProgress: PublicationProgress | null;
  failureOrigin: CampaignFailureOrigin | null;
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

function limited(value: string, field: string, max: number): string {
  if (value.length > max) throw new InvalidCampaignError(field);
  return value;
}

// Los datos del brief, validados. Los usan la creación y la edición del borrador.
function briefDetails(input: CampaignDetails, at: Date) {
  const promotion = input.promotion ?? null;
  if (promotion !== null && !(promotion instanceof Promotion))
    throw new InvalidCampaignError('promotion');
  promotion?.assertNotExpired(at);
  const objective = input.objective ?? CampaignObjective.PROMOTION;
  if (!Object.values(CampaignObjective).includes(objective))
    throw new InvalidCampaignError('objective');
  const occasion =
    input.occasion == null
      ? null
      : limited(text(input.occasion, 'occasion', false), 'occasion', OCCASION_MAX_LENGTH) || null;
  return {
    title: text(input.title, 'title'),
    productId: entityId(input.productId, 'productId'),
    templateId: entityId(input.templateId, 'templateId'),
    templateRevisionId: entityId(input.templateRevisionId, 'templateRevisionId'),
    objective,
    occasion,
    instructions: limited(
      text(input.instructions === undefined ? '' : input.instructions, 'instructions', false),
      'instructions',
      INSTRUCTIONS_MAX_LENGTH,
    ),
    cta: text(input.cta, 'cta'),
    promotion,
  };
}

export class Campaign {
  readonly #state: Readonly<CampaignState>;
  private constructor(state: CampaignState) {
    this.#state = Object.freeze(state);
  }

  static create(id: string, input: CampaignDetails, at: Date): Campaign {
    const createdAt = timestamp(at);
    return new Campaign({
      id: entityId(id, 'campaignId'),
      organizationId: entityId(input.organizationId, 'organizationId'),
      ...briefDetails(input, at),
      status: CampaignStatus.DRAFT,
      generation: null,
      lastGenerationNumber: 0,
      candidateContent: null,
      approvedContentId: null,
      approvedSocialAccountIds: Object.freeze([]),
      publicationProgress: null,
      failureOrigin: null,
      generationFailure: null,
      version: 0,
      createdAt,
      updatedAt: createdAt,
    });
  }

  /** Rehidrata un estado validado directamente, sin repetir las transiciones de negocio. */
  static restore(state: CampaignState): Campaign {
    const base = Campaign.create(state.id, state, new Date(state.createdAt));
    const updatedAt = timestamp(new Date(state.updatedAt), state.createdAt);
    if (!Object.values(CampaignStatus).includes(state.status))
      throw new InvalidCampaignError('status');
    if (!Number.isSafeInteger(state.version) || state.version < 0)
      throw new InvalidCampaignError('version');
    const isDraft = state.status === CampaignStatus.DRAFT;
    // Un borrador sube de versión con cada edición, así que no tiene por qué estar en la 0.
    if (isDraft !== (state.generation === null) || (!isDraft && state.version < 1))
      throw new InvalidCampaignError('generation');

    let generation: GenerationOperation | null = null;
    if (state.generation !== null) {
      const input = state.generation;
      if (!Number.isSafeInteger(input.number) || input.number < 1 || input.number > state.version)
        throw new InvalidCampaignError('generationNumber');
      base.assertSnapshotMatches(input.snapshot);
      const requestedAt = timestamp(new Date(input.requestedAt), state.createdAt);
      timestamp(new Date(updatedAt), requestedAt);
      generation = Object.freeze({
        id: entityId(input.id, 'generationId'),
        number: input.number,
        snapshot: input.snapshot,
        requestedAt,
      });
    }
    const lastGenerationNumber = state.lastGenerationNumber ?? generation?.number ?? 0;
    if (
      !Number.isSafeInteger(lastGenerationNumber) ||
      lastGenerationNumber < (generation?.number ?? 0) ||
      (generation === null && lastGenerationNumber !== 0)
    )
      throw new InvalidCampaignError('lastGenerationNumber');
    const content = state.candidateContent;
    if (content !== null) {
      if (
        !(content instanceof GeneratedContent) ||
        !generation ||
        content.organizationId !== base.organizationId ||
        content.campaignId !== base.id ||
        content.generationId !== generation.id ||
        content.revision !== generation.number ||
        !content.snapshot.equals(generation.snapshot)
      )
        throw new ContentRevisionMismatchError();
      timestamp(content.createdAt, generation.requestedAt);
      timestamp(new Date(updatedAt), content.createdAt.getTime());
    }
    const publicationFailure = state.failureOrigin === CampaignFailureOrigin.PUBLICATION;
    const needsContent =
      [
        CampaignStatus.PENDING_APPROVAL,
        CampaignStatus.APPROVED,
        CampaignStatus.PUBLISHING,
        CampaignStatus.PUBLISHED,
        CampaignStatus.PARTIALLY_PUBLISHED,
      ].includes(state.status) ||
      (state.status === CampaignStatus.FAILED && publicationFailure);
    if (needsContent !== (content !== null)) throw new InvalidCampaignError('candidateContent');
    const needsApproval = needsContent && state.status !== CampaignStatus.PENDING_APPROVAL;
    const minimumVersion =
      generation === null
        ? 0
        : 2 * generation.number - 1 + (needsContent ? 1 : 0) + (needsApproval ? 1 : 0);
    if (!Number.isSafeInteger(minimumVersion) || state.version < minimumVersion)
      throw new InvalidCampaignError('version');
    if (needsApproval ? state.approvedContentId !== content?.id : state.approvedContentId !== null)
      throw new ContentRevisionMismatchError();
    if (!Array.isArray(state.approvedSocialAccountIds))
      throw new InvalidCampaignError('socialAccountIds');
    const accounts = state.approvedSocialAccountIds.map((id) => entityId(id, 'socialAccountId'));
    if (new Set(accounts).size !== accounts.length || (!needsApproval && accounts.length > 0))
      throw new InvalidCampaignError('socialAccountIds');
    const needsProgress =
      [
        CampaignStatus.PUBLISHING,
        CampaignStatus.PUBLISHED,
        CampaignStatus.PARTIALLY_PUBLISHED,
      ].includes(state.status) ||
      (state.status === CampaignStatus.FAILED && publicationFailure);
    let publicationProgress: PublicationProgress | null = null;
    if (needsProgress) {
      if (!(state.publicationProgress instanceof PublicationProgress) || !state.approvedContentId)
        throw new InvalidCampaignError('publicationProgress');
      publicationProgress = PublicationProgress.restore(
        base.organizationId,
        base.id,
        state.approvedContentId,
        accounts,
        state.publicationProgress.entries,
      );
      if (publicationProgress.status !== state.status)
        throw new InvalidCampaignError('publicationProgress');
    } else if (state.publicationProgress !== null)
      throw new InvalidCampaignError('publicationProgress');
    const failed = [CampaignStatus.FAILED, CampaignStatus.PARTIALLY_PUBLISHED].includes(
      state.status,
    );
    const expectedOrigin = !failed
      ? null
      : needsProgress
        ? CampaignFailureOrigin.PUBLICATION
        : CampaignFailureOrigin.GENERATION;
    if (state.failureOrigin !== expectedOrigin) throw new InvalidCampaignError('failureOrigin');
    if (
      expectedOrigin === CampaignFailureOrigin.GENERATION
        ? !Object.values(GenerationFailureCode).includes(state.generationFailure!)
        : state.generationFailure !== null
    )
      throw new InvalidCampaignError('generationFailure');
    return new Campaign({
      ...base.#state,
      status: state.status,
      generation,
      lastGenerationNumber,
      candidateContent: content,
      approvedContentId: state.approvedContentId,
      approvedSocialAccountIds: Object.freeze(accounts),
      publicationProgress,
      failureOrigin: state.failureOrigin,
      generationFailure: state.generationFailure,
      version: state.version,
      updatedAt,
    });
  }

  /** Cambia el brief de un borrador. Los datos se validan igual que al crear la campaña. */
  updateDraft(input: Omit<CampaignDetails, 'organizationId'>, at: Date): Campaign {
    if (this.status !== CampaignStatus.DRAFT) throw new InvalidCampaignTransitionError();
    return this.change(briefDetails({ ...input, organizationId: this.organizationId }, at), at);
  }

  requestGeneration(id: string, snapshot: GenerationSnapshot, at: Date): Campaign {
    if (
      this.status !== CampaignStatus.DRAFT &&
      !(
        this.status === CampaignStatus.FAILED &&
        this.failureOrigin === CampaignFailureOrigin.GENERATION
      )
    ) {
      throw new InvalidCampaignTransitionError();
    }
    return this.beginGeneration(id, snapshot, at);
  }

  // Una versión nueva con los datos actuales (ADR-0026). Desde GENERATING sirve para destrabar
  // un trabajo detenido: el trabajo anterior queda obsoleto.
  requestRegeneration(id: string, snapshot: GenerationSnapshot, at: Date): Campaign {
    if (!this.canChangeVersion()) throw new InvalidCampaignTransitionError();
    return this.beginGeneration(id, snapshot, at);
  }

  /**
   * Vuelve a una versión anterior (ADR-0026): su generación pasa a ser la vigente y su contenido
   * el candidato, pendiente de aprobación. Quita la aprobación que hubiera.
   */
  restoreVersion(generation: GenerationOperation, content: GeneratedContent, at: Date): Campaign {
    if (!this.canChangeVersion()) throw new InvalidCampaignTransitionError();
    if (
      !(content instanceof GeneratedContent) ||
      content.organizationId !== this.organizationId ||
      content.campaignId !== this.id ||
      content.generationId !== generation.id ||
      content.revision !== generation.number ||
      !content.snapshot.equals(generation.snapshot) ||
      generation.number > this.lastGenerationNumber
    )
      throw new ContentRevisionMismatchError();
    this.assertSnapshotMatches(generation.snapshot);
    if (this.status === CampaignStatus.PENDING_APPROVAL && this.candidateContent?.id === content.id)
      return this;
    return this.change(
      {
        status: CampaignStatus.PENDING_APPROVAL,
        generation: Object.freeze({ ...generation }),
        candidateContent: content,
        approvedContentId: null,
        approvedSocialAccountIds: Object.freeze([]),
        failureOrigin: null,
        generationFailure: null,
      },
      at,
    );
  }

  // Antes de publicar se puede cambiar de versión; después, la publicación usa la aprobada.
  private canChangeVersion(): boolean {
    return (
      [
        CampaignStatus.PENDING_APPROVAL,
        CampaignStatus.APPROVED,
        CampaignStatus.GENERATING,
      ].includes(this.status) ||
      (this.status === CampaignStatus.FAILED &&
        this.failureOrigin === CampaignFailureOrigin.GENERATION)
    );
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
    return this.change(
      {
        status: CampaignStatus.PENDING_APPROVAL,
        candidateContent: content,
      },
      at,
    );
  }

  approve(contentId: string, at: Date, socialAccountIds: readonly string[] = []): Campaign {
    if (this.status !== CampaignStatus.PENDING_APPROVAL) throw new InvalidCampaignTransitionError();
    const approvedContentId = entityId(contentId, 'contentId');
    if (!this.candidateContent || this.candidateContent.id !== approvedContentId) {
      throw new ContentRevisionMismatchError();
    }
    this.promotion?.assertNotExpired(at);
    if (!Array.isArray(socialAccountIds)) throw new InvalidCampaignError('socialAccountIds');
    const approvedSocialAccountIds = socialAccountIds.map((id: string) =>
      entityId(id, 'socialAccountId'),
    );
    if (new Set(approvedSocialAccountIds).size !== approvedSocialAccountIds.length)
      throw new InvalidCampaignError('socialAccountIds');
    return this.change(
      {
        status: CampaignStatus.APPROVED,
        approvedContentId,
        approvedSocialAccountIds: Object.freeze(approvedSocialAccountIds),
      },
      at,
    );
  }

  startPublication(publications: readonly CampaignPublication[], at: Date): Campaign {
    if (this.status !== CampaignStatus.APPROVED || this.approvedContentId === null)
      throw new InvalidCampaignTransitionError();
    this.promotion?.assertNotExpired(at);
    const publicationProgress = PublicationProgress.start(
      this.organizationId,
      this.id,
      this.approvedContentId,
      this.approvedSocialAccountIds,
      publications,
    );
    return this.change(
      {
        status: CampaignStatus.PUBLISHING,
        publicationProgress,
      },
      at,
    );
  }

  recordPublicationSummary(publications: readonly CampaignPublication[], at: Date): Campaign {
    if (!this.publicationProgress) throw new InvalidCampaignTransitionError();
    const publicationProgress = this.publicationProgress.record(publications);
    if (publicationProgress === this.publicationProgress) return this;
    if (this.status !== CampaignStatus.PUBLISHING) throw new InvalidCampaignTransitionError();
    const status = publicationProgress.status;
    const failureOrigin = [CampaignStatus.FAILED, CampaignStatus.PARTIALLY_PUBLISHED].includes(
      status,
    )
      ? CampaignFailureOrigin.PUBLICATION
      : null;
    return this.change(
      {
        status,
        publicationProgress,
        failureOrigin,
      },
      at,
    );
  }

  retryPublication(publications: readonly CampaignPublication[], at: Date): Campaign {
    if (
      ![CampaignStatus.FAILED, CampaignStatus.PARTIALLY_PUBLISHED].includes(this.status) ||
      this.failureOrigin !== CampaignFailureOrigin.PUBLICATION ||
      !this.publicationProgress
    )
      throw new InvalidCampaignTransitionError();
    this.promotion?.assertNotExpired(at);
    const publicationProgress = this.publicationProgress.retry(publications);
    return this.change(
      {
        status: CampaignStatus.PUBLISHING,
        publicationProgress,
        failureOrigin: null,
      },
      at,
    );
  }

  recordGenerationFailure(id: string, code: GenerationFailureCode, at: Date): Campaign {
    this.requireGeneration(id);
    if (!Object.values(GenerationFailureCode).includes(code))
      throw new InvalidCampaignError('generationFailure');
    if (this.status === CampaignStatus.FAILED) {
      if (this.failureOrigin !== CampaignFailureOrigin.GENERATION)
        throw new InvalidCampaignTransitionError();
      if (this.generationFailure === code) return this;
      throw new ConflictingGenerationResultError();
    }
    if (this.status !== CampaignStatus.GENERATING) throw new InvalidCampaignTransitionError();
    return this.change(
      {
        status: CampaignStatus.FAILED,
        generationFailure: code,
        failureOrigin: CampaignFailureOrigin.GENERATION,
      },
      at,
    );
  }

  private beginGeneration(id: string, snapshot: GenerationSnapshot, at: Date): Campaign {
    const generationId = entityId(id, 'generationId');
    if (this.generation?.id === generationId) throw new InvalidCampaignError('generationId');
    // El máximo de la campaña, no el de la vigente: tras recuperar una versión anterior, el
    // siguiente número ya puede estar usado.
    const number = this.lastGenerationNumber + 1;
    if (!Number.isSafeInteger(number)) throw new InvalidCampaignError('generationNumber');
    this.assertSnapshotMatches(snapshot);
    this.promotion?.assertNotExpired(at);
    const requestedAt = timestamp(at, this.#state.updatedAt);
    return this.change(
      {
        status: CampaignStatus.GENERATING,
        generation: Object.freeze({
          id: generationId,
          number,
          snapshot,
          requestedAt,
        }),
        lastGenerationNumber: number,
        candidateContent: null,
        approvedContentId: null,
        approvedSocialAccountIds: Object.freeze([]),
        failureOrigin: null,
        generationFailure: null,
      },
      at,
    );
  }

  private assertSnapshotMatches(snapshot: GenerationSnapshot): void {
    if (!(snapshot instanceof GenerationSnapshot)) throw new InvalidCampaignError('snapshot');
    const data = snapshot.data;
    if (
      data.organization.id !== this.organizationId ||
      data.product.id !== this.productId ||
      data.template.id !== this.templateId ||
      data.template.revisionId !== this.templateRevisionId ||
      data.objective !== this.objective ||
      data.occasion !== this.occasion ||
      data.cta !== this.cta ||
      data.instructions !== this.instructions ||
      JSON.stringify(data.promotion) !== JSON.stringify(this.promotion?.toSnapshot() ?? null)
    ) {
      throw new InvalidCampaignError('snapshot');
    }
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
  get objective(): CampaignObjective {
    return this.#state.objective;
  }
  get occasion(): string | null {
    return this.#state.occasion;
  }
  /** Lo que la campaña aporta al snapshot de una generación. */
  get brief(): CampaignBrief {
    return {
      objective: this.objective,
      occasion: this.occasion,
      instructions: this.instructions,
      cta: this.cta,
      promotion: this.promotion,
    };
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
  get lastGenerationNumber(): number {
    return this.#state.lastGenerationNumber ?? this.#state.generation?.number ?? 0;
  }
  get candidateContent(): GeneratedContent | null {
    return this.#state.candidateContent;
  }
  get approvedContentId(): EntityId | null {
    return this.#state.approvedContentId;
  }
  get approvedSocialAccountIds(): readonly EntityId[] {
    return this.#state.approvedSocialAccountIds;
  }
  get publicationProgress(): PublicationProgress | null {
    return this.#state.publicationProgress;
  }
  get failureOrigin(): CampaignFailureOrigin | null {
    return this.#state.failureOrigin;
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
