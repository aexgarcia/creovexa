import type { Clock } from '#app/application/ports/clock';
import type { JobQueue } from '#app/application/ports/job-queue';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';
import {
  InvalidCampaignTransitionError,
  type CampaignGenerations,
  type CampaignReference,
} from '#app/modules/campaigns/contract';
import { GENERATE_COPY_JOB } from '../generation-job.js';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import type { CopyGenerator } from '../ports/copy-generator.js';
import type { CampaignCopyStatus } from './generate-campaign-copy.js';

// Acepta la petición y deja el trabajo a la cola. Pedirlo otra vez mientras un trabajo
// espera o corre no inicia un segundo.
export class RequestCampaignCopy {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly copies: CampaignCopyRepository,
    private readonly generator: CopyGenerator,
    private readonly queue: JobQueue,
    private readonly transactions: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CampaignReference): Promise<CampaignCopyStatus> {
    const campaign = await this.generations.view(input);
    if (campaign.status !== 'DRAFT' && campaign.status !== 'GENERATING')
      throw new InvalidCampaignTransitionError();
    if (campaign.generation) {
      const selection = {
        organizationId: campaign.organizationId,
        campaignId: campaign.campaignId,
        generationId: campaign.generation.id,
      };
      const saved = await this.copies.find(selection);
      if (saved)
        return {
          generationId: selection.generationId,
          status: 'READY',
          failureCode: null,
          copy: saved,
        };
    }
    // Falla ahora, antes de cambiar la campaña, si ningún proveedor podría hacer el trabajo.
    this.generator.assertAvailable();
    // El cambio de estado, la marca de pedido y el trabajo se confirman juntos o ninguno.
    const generationId = await this.transactions.run(async (transaction) => {
      const current =
        campaign.status === 'DRAFT' ? await this.generations.begin(input, transaction) : campaign;
      const selection = {
        organizationId: current.organizationId,
        campaignId: current.campaignId,
        generationId: current.generation!.id,
      };
      await this.copies.queue(selection, this.clock.now(), transaction);
      await this.queue.enqueue(
        { name: GENERATE_COPY_JOB, key: selection.generationId, payload: { ...selection } },
        transaction,
      );
      return selection.generationId;
    });
    return { generationId, status: 'PENDING', failureCode: null, copy: null };
  }
}
