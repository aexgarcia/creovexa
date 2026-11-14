import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import type { CampaignImageSelection } from './campaign-final-assets.js';

// Campaign persistence bound to a transaction another module started.
export interface CampaignWorkspace {
  repositoryIn(transaction: TransactionContext): CampaignRepository;
  // Locks the campaign row; false unless this generation is current and GENERATING.
  lock(
    generation: CampaignImageSelection,
    transaction: TransactionContext,
    expectedVersion?: number,
  ): Promise<boolean>;
}
