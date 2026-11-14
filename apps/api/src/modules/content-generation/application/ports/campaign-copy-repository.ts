import type { EntityId } from '#app/domain/entity-id';
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
}
