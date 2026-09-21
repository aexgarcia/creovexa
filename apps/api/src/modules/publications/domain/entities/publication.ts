import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { PublicationStatus } from '#app/domain/publication-status';
import { SocialPlatform } from '../social-platform.js';
import {
  InvalidPublicationError,
  InvalidPublicationTransitionError,
  StalePublicationAttemptError,
  ConflictingPublicationResultError,
} from '../errors/publication.errors.js';

export enum PublicationFailureCode {
  REJECTED = 'REJECTED',
  ACCOUNT_UNAVAILABLE = 'ACCOUNT_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
}

export interface PublicationDetails {
  organizationId: string;
  campaignId: string;
  approvedContentId: string;
  socialAccountId: string;
  platform: SocialPlatform;
}

export interface PublicationAttempt {
  readonly id: EntityId;
  readonly number: number;
  readonly startedAt: number;
}

export interface PublicationState {
  id: EntityId;
  organizationId: EntityId;
  campaignId: EntityId;
  approvedContentId: EntityId;
  socialAccountId: EntityId;
  platform: SocialPlatform;
  status: PublicationStatus;
  attempt: PublicationAttempt | null;
  externalPostId: string | null;
  failureCode: PublicationFailureCode | null;
  publishedAt: number | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export class Publication {
  readonly #state: Readonly<PublicationState>;

  private constructor(state: PublicationState) {
    this.#state = Object.freeze(state);
  }

  static create(id: string, input: PublicationDetails, at: Date): Publication {
    if (!Object.values(SocialPlatform).includes(input.platform))
      throw new InvalidPublicationError('platform');
    const createdAt = timestamp(at);
    return new Publication({
      id: entityId(id, 'publicationId'),
      organizationId: entityId(input.organizationId, 'organizationId'),
      campaignId: entityId(input.campaignId, 'campaignId'),
      approvedContentId: entityId(input.approvedContentId, 'approvedContentId'),
      socialAccountId: entityId(input.socialAccountId, 'socialAccountId'),
      platform: input.platform,
      status: PublicationStatus.PENDING,
      attempt: null,
      externalPostId: null,
      failureCode: null,
      publishedAt: null,
      version: 0,
      createdAt,
      updatedAt: createdAt,
    });
  }

  static restore(state: PublicationState): Publication {
    const base = Publication.create(state.id, state, new Date(state.createdAt));
    const updatedAt = timestamp(new Date(state.updatedAt), state.createdAt);
    if (!Object.values(PublicationStatus).includes(state.status))
      throw new InvalidPublicationError('status');
    if (!Number.isSafeInteger(state.version) || state.version < 0)
      throw new InvalidPublicationError('version');
    const pending = state.status === PublicationStatus.PENDING;
    if (pending !== (state.attempt === null)) throw new InvalidPublicationError('attempt');
    let attempt: PublicationAttempt | null = null;
    if (state.attempt !== null) {
      const input = state.attempt;
      if (!Number.isSafeInteger(input.number) || input.number < 1)
        throw new InvalidPublicationError('attemptNumber');
      const startedAt = timestamp(new Date(input.startedAt), state.createdAt);
      timestamp(new Date(updatedAt), startedAt);
      attempt = Object.freeze({
        id: entityId(input.id, 'attemptId'),
        number: input.number,
        startedAt,
      });
    }
    const terminal = [PublicationStatus.PUBLISHED, PublicationStatus.FAILED].includes(state.status);
    const version = attempt === null ? 0 : 2 * attempt.number - (terminal ? 0 : 1);
    if (
      !Number.isSafeInteger(version) ||
      state.version !== version ||
      (pending && updatedAt !== state.createdAt)
    )
      throw new InvalidPublicationError('version');
    let externalPostId: string | null = null;
    let publishedAt: number | null = null;
    if (state.status === PublicationStatus.PUBLISHED) {
      if (
        typeof state.externalPostId !== 'string' ||
        !state.externalPostId.trim() ||
        state.publishedAt === null
      )
        throw new InvalidPublicationError('externalPostId');
      externalPostId = state.externalPostId.trim();
      publishedAt = timestamp(new Date(state.publishedAt), attempt!.startedAt);
      if (publishedAt !== updatedAt) throw new InvalidPublicationError('publishedAt');
    } else if (state.externalPostId !== null || state.publishedAt !== null)
      throw new InvalidPublicationError('result');
    if (
      state.status === PublicationStatus.FAILED
        ? !Object.values(PublicationFailureCode).includes(state.failureCode!)
        : state.failureCode !== null
    )
      throw new InvalidPublicationError('failureCode');
    return new Publication({
      ...base.#state,
      status: state.status,
      attempt,
      externalPostId,
      failureCode: state.failureCode,
      publishedAt,
      version,
      updatedAt,
    });
  }

  startAttempt(id: string, at: Date): Publication {
    if (![PublicationStatus.PENDING, PublicationStatus.FAILED].includes(this.status))
      throw new InvalidPublicationTransitionError();
    const attemptId = entityId(id, 'attemptId');
    if (attemptId === this.attempt?.id) throw new InvalidPublicationError('attemptId');
    const number = (this.attempt?.number ?? 0) + 1;
    if (!Number.isSafeInteger(number)) throw new InvalidPublicationError('attemptNumber');
    return this.change(
      {
        status: PublicationStatus.PUBLISHING,
        attempt: Object.freeze({
          id: attemptId,
          number,
          startedAt: timestamp(at, this.#state.updatedAt),
        }),
        failureCode: null,
      },
      at,
    );
  }

  recordSuccess(attemptId: string, externalPostId: string, at: Date): Publication {
    this.requireAttempt(attemptId);
    if (typeof externalPostId !== 'string' || !externalPostId.trim())
      throw new InvalidPublicationError('externalPostId');
    const reference = externalPostId.trim();
    if (this.status === PublicationStatus.PUBLISHED) {
      if (this.externalPostId === reference) return this;
      throw new ConflictingPublicationResultError();
    }
    if (this.status === PublicationStatus.FAILED) throw new ConflictingPublicationResultError();
    if (this.status !== PublicationStatus.PUBLISHING) throw new InvalidPublicationTransitionError();
    return this.change(
      {
        status: PublicationStatus.PUBLISHED,
        externalPostId: reference,
        publishedAt: timestamp(at, this.attempt!.startedAt),
      },
      at,
    );
  }

  recordFailure(attemptId: string, code: PublicationFailureCode, at: Date): Publication {
    this.requireAttempt(attemptId);
    if (!Object.values(PublicationFailureCode).includes(code))
      throw new InvalidPublicationError('failureCode');
    if (this.status === PublicationStatus.FAILED) {
      if (this.failureCode === code) return this;
      throw new ConflictingPublicationResultError();
    }
    if (this.status === PublicationStatus.PUBLISHED) throw new ConflictingPublicationResultError();
    if (this.status !== PublicationStatus.PUBLISHING) throw new InvalidPublicationTransitionError();
    return this.change({ status: PublicationStatus.FAILED, failureCode: code }, at);
  }

  private requireAttempt(id: string): void {
    if (entityId(id, 'attemptId') !== this.attempt?.id) throw new StalePublicationAttemptError();
  }

  private change(changes: Partial<PublicationState>, at: Date): Publication {
    const version = this.version + 1;
    if (!Number.isSafeInteger(version)) throw new InvalidPublicationError('version');
    return new Publication({
      ...this.#state,
      ...changes,
      version,
      updatedAt: timestamp(at, this.#state.updatedAt),
    });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get organizationId(): EntityId {
    return this.#state.organizationId;
  }
  get campaignId(): EntityId {
    return this.#state.campaignId;
  }
  get approvedContentId(): EntityId {
    return this.#state.approvedContentId;
  }
  get socialAccountId(): EntityId {
    return this.#state.socialAccountId;
  }
  get platform(): SocialPlatform {
    return this.#state.platform;
  }
  get status(): PublicationStatus {
    return this.#state.status;
  }
  get attempt(): PublicationAttempt | null {
    return this.#state.attempt;
  }
  get externalPostId(): string | null {
    return this.#state.externalPostId;
  }
  get failureCode(): PublicationFailureCode | null {
    return this.#state.failureCode;
  }
  get version(): number {
    return this.#state.version;
  }
  get publishedAt(): Date | null {
    return this.#state.publishedAt === null ? null : new Date(this.#state.publishedAt);
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
