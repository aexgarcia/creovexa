// Published contract of the campaigns module.
// Other modules may import this file and nothing else from campaigns.
import type { EntityId } from '#app/domain/entity-id';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { CampaignStatus } from './domain/campaign-status.js';
import type { GenerationSnapshotData } from './domain/value-objects/generation-snapshot.js';

export { CampaignImageError } from './application/errors/campaign-image.error.js';
export {
  InvalidCampaignTransitionError,
  StaleGenerationResultError,
} from './domain/errors/campaign.errors.js';
export type {
  CampaignAssetPurpose,
  CampaignImageSelection,
  StoredCampaignAsset,
} from './application/ports/campaign-final-assets.js';
export type { GenerationSnapshotData };

export const CAMPAIGN_GENERATIONS = Symbol('CAMPAIGN_GENERATIONS');

export interface CampaignReference {
  organizationId: string;
  campaignId: string;
}

export interface GenerationReference {
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
}

export interface GeneratedCampaignContent {
  id: EntityId;
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
  revision: number;
  headline: string;
  caption: string;
  cta: string;
  hashtags: readonly string[];
  assetIds: readonly EntityId[];
}

export interface CampaignGenerationView {
  organizationId: EntityId;
  campaignId: EntityId;
  status: `${CampaignStatus}`;
  version: number;
  // The generation in progress or last requested, with the data frozen for it.
  generation: { id: EntityId; number: number; snapshot: GenerationSnapshotData } | null;
  candidateContent: GeneratedCampaignContent | null;
}

export interface RecordGeneratedContentInput extends GenerationReference {
  expectedVersion: number;
  copy: { headline: string; caption: string; cta: string; hashtags: readonly string[] };
  finalAssetId: EntityId;
  at: Date;
}

export interface CampaignGenerations {
  // Reads the campaign. With generationId, fails unless it is the current generation.
  view(campaign: CampaignReference, generationId?: string): Promise<CampaignGenerationView>;
  // Captures the snapshot and moves a campaign that allows it to GENERATING.
  // With a transaction, the change commits together with the caller's work.
  begin(
    campaign: CampaignReference,
    transaction?: TransactionContext,
  ): Promise<CampaignGenerationView>;
  // Fails when the campaign promotion has ended at the given instant.
  assertPromotionActive(campaign: CampaignReference, at: Date): Promise<void>;
  // Inside the caller's transaction: serializes work on the campaign and reports whether
  // the generation is still current and GENERATING, at the expected version when given.
  lock(
    generation: GenerationReference,
    transaction: TransactionContext,
    expectedVersion?: number,
  ): Promise<boolean>;
  // Inside the caller's transaction: stores the content and moves to PENDING_APPROVAL.
  recordContent(
    input: RecordGeneratedContentInput,
    transaction: TransactionContext,
  ): Promise<GeneratedCampaignContent>;
}
