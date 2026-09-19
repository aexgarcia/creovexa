import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { IncompleteGeneratedContentError } from '../errors/campaign.errors.js';
import { GenerationSnapshot } from '../value-objects/generation-snapshot.js';

export interface GeneratedContentPayload {
  headline: string;
  caption: string;
  cta: string;
  hashtags: readonly string[];
  assetIds: readonly string[];
}

export interface GeneratedContentIdentity {
  id: string;
  organizationId: string;
  campaignId: string;
  generationId: string;
  revision: number;
}

function required(value: string, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new IncompleteGeneratedContentError(field);
  return value.trim();
}

export class GeneratedContent {
  private constructor(
    readonly id: EntityId,
    readonly organizationId: EntityId,
    readonly campaignId: EntityId,
    readonly generationId: EntityId,
    readonly revision: number,
    readonly snapshot: GenerationSnapshot,
    readonly headline: string,
    readonly caption: string,
    readonly cta: string,
    readonly hashtags: readonly string[],
    readonly assetIds: readonly EntityId[],
    private readonly created: number,
  ) {
    Object.freeze(this);
  }

  static create(
    identity: GeneratedContentIdentity,
    snapshot: GenerationSnapshot,
    payload: GeneratedContentPayload,
    at: Date,
  ): GeneratedContent {
    if (!(snapshot instanceof GenerationSnapshot))
      throw new IncompleteGeneratedContentError('snapshot');
    const organizationId = entityId(identity.organizationId, 'organizationId');
    if (snapshot.data.organization.id !== organizationId)
      throw new IncompleteGeneratedContentError('organizationId');
    if (!Number.isSafeInteger(identity.revision) || identity.revision < 1) {
      throw new IncompleteGeneratedContentError('revision');
    }
    if (!Array.isArray(payload.hashtags)) throw new IncompleteGeneratedContentError('hashtags');
    if (!Array.isArray(payload.assetIds) || payload.assetIds.length === 0) {
      throw new IncompleteGeneratedContentError('assetIds');
    }
    const assetIds = payload.assetIds.map((id: string) => entityId(id, 'assetIds'));
    if (new Set(assetIds).size !== assetIds.length)
      throw new IncompleteGeneratedContentError('assetIds');
    const cta = required(payload.cta, 'cta');
    if (cta !== snapshot.data.cta) throw new IncompleteGeneratedContentError('cta');
    return new GeneratedContent(
      entityId(identity.id, 'contentId'),
      organizationId,
      entityId(identity.campaignId, 'campaignId'),
      entityId(identity.generationId, 'generationId'),
      identity.revision,
      snapshot,
      required(payload.headline, 'headline'),
      required(payload.caption, 'caption'),
      cta,
      Object.freeze(payload.hashtags.map((tag: string) => required(tag, 'hashtags'))),
      Object.freeze(assetIds),
      timestamp(at),
    );
  }

  get createdAt(): Date {
    return new Date(this.created);
  }

  sameResult(other: GeneratedContent): boolean {
    return (
      this.organizationId === other.organizationId &&
      this.campaignId === other.campaignId &&
      this.generationId === other.generationId &&
      this.revision === other.revision &&
      this.snapshot.equals(other.snapshot) &&
      this.headline === other.headline &&
      this.caption === other.caption &&
      this.cta === other.cta &&
      JSON.stringify(this.hashtags) === JSON.stringify(other.hashtags) &&
      JSON.stringify(this.assetIds) === JSON.stringify(other.assetIds)
    );
  }
}
