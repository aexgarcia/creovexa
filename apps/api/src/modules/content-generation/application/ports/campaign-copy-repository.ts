import type { EntityId } from '#app/domain/entity-id';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { GenerationJobState } from '../generation-job.js';
import type { CampaignCopy } from './copy-generator.js';
export interface CopySelection {
  organizationId: EntityId;
  campaignId: EntityId;
  generationId: EntityId;
}
export interface CopyLease extends CopySelection {
  token: EntityId;
  now: Date;
  expiresAt: Date;
}
export interface CampaignCopyRepository {
  find(selection: CopySelection): Promise<CampaignCopy | null>;
  claim(lease: CopyLease): Promise<boolean>;
  complete(lease: CopyLease, content: CampaignCopy): Promise<void>;
  release(lease: CopyLease): Promise<void>;
  // Job state for the CMS; a reservation that expired without finishing counts as failed.
  state(selection: CopySelection, now: Date): Promise<GenerationJobState | null>;
  // Marks the copy as requested, inside the transaction that queues its job. Keeps READY copy.
  queue(selection: CopySelection, at: Date, transaction: TransactionContext): Promise<void>;
  // Records why the job failed. Never overwrites READY copy.
  fail(selection: CopySelection, failureCode: string, at: Date): Promise<void>;
}
