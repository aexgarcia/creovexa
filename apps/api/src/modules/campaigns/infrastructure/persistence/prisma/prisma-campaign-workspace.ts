import type { TransactionContext } from '#app/application/ports/transaction-context';
import { prismaTransaction } from '#app/infrastructure/persistence/prisma/transaction-context';
import type { CampaignImageSelection } from '../../../application/ports/campaign-final-assets.js';
import type { CampaignWorkspace } from '../../../application/ports/campaign-workspace.js';
import { PrismaCampaignRepository } from './prisma-campaign.repository.js';

export class PrismaCampaignWorkspace implements CampaignWorkspace {
  repositoryIn(transaction: TransactionContext) {
    return new PrismaCampaignRepository(prismaTransaction(transaction));
  }

  async lock(
    generation: CampaignImageSelection,
    transaction: TransactionContext,
    expectedVersion?: number,
  ): Promise<boolean> {
    // Un update sin cambios bloquea la fila dueña usando el esquema configurado en Prisma.
    const result = await prismaTransaction(transaction).campaign.updateMany({
      where: {
        id: generation.campaignId,
        organizationId: generation.organizationId,
        currentGenerationId: generation.generationId,
        status: 'GENERATING',
        ...(expectedVersion === undefined ? {} : { version: expectedVersion }),
      },
      data: { version: { increment: 0 } },
    });
    return result.count === 1;
  }
}
