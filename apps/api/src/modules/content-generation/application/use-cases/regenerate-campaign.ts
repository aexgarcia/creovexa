import type { Clock } from '#app/application/ports/clock';
import type { JobQueue } from '#app/application/ports/job-queue';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';
import type { CampaignGenerations, CampaignReference } from '#app/modules/campaigns/contract';
import { validateCopy } from '../copy-policy.js';
import { GENERATE_COPY_JOB } from '../generation-job.js';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import type { CampaignCopy, CopyGenerator } from '../ports/copy-generator.js';
import type { CampaignCopyStatus } from './generate-campaign-copy.js';

// Empieza otra versión del flyer con los datos actuales (ADR-0026). Los textos de la versión
// anterior se reusan si siguen cumpliendo las reglas con el snapshot nuevo, con las correcciones
// del usuario incluidas; si no, se pide un copy nuevo. La imagen la pide el usuario después.
export class RegenerateCampaign {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly copies: CampaignCopyRepository,
    private readonly generator: CopyGenerator,
    private readonly queue: JobQueue,
    private readonly transactions: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: CampaignReference): Promise<CampaignCopyStatus> {
    const before = await this.generations.view(input);
    const previous = before.generation
      ? await this.copies.find({
          organizationId: before.organizationId,
          campaignId: before.campaignId,
          generationId: before.generation.id,
        })
      : null;
    // Sin textos que reusar, falla ahora si ningún proveedor podría escribirlos.
    if (!previous) this.generator.assertAvailable();
    return this.transactions.run(async (transaction) => {
      const current = await this.generations.regenerate(input, transaction);
      const generation = current.generation!;
      const selection = {
        organizationId: current.organizationId,
        campaignId: current.campaignId,
        generationId: generation.id,
      };
      const now = this.clock.now();
      const reused = previous && reusable(previous, generation.snapshot);
      if (reused) {
        await this.copies.store(selection, reused, now, transaction);
        return { generationId: generation.id, status: 'READY', failureCode: null, copy: reused };
      }
      await this.copies.queue(selection, now, transaction);
      await this.queue.enqueue(
        { name: GENERATE_COPY_JOB, key: selection.generationId, payload: { ...selection } },
        transaction,
      );
      return { generationId: generation.id, status: 'PENDING', failureCode: null, copy: null };
    });
  }
}

// El copy anterior, si cumple las reglas con los datos nuevos: precios, nombre y CTA.
function reusable(
  copy: CampaignCopy,
  snapshot: Parameters<typeof validateCopy>[1],
): CampaignCopy | null {
  try {
    return validateCopy({ ...copy }, snapshot);
  } catch {
    return null;
  }
}
