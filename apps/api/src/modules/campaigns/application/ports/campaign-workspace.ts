import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import type { CampaignImageSelection } from './campaign-final-assets.js';

// Persistencia de la campaña ligada a una transacción que inició otro módulo.
export interface CampaignWorkspace {
  repositoryIn(transaction: TransactionContext): CampaignRepository;
  // Bloquea la fila de la campaña; false salvo que esta generación sea la actual y esté en GENERATING.
  lock(
    generation: CampaignImageSelection,
    transaction: TransactionContext,
    expectedVersion?: number,
  ): Promise<boolean>;
}
