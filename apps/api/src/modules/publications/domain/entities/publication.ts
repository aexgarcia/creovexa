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

interface PublicationState {
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
