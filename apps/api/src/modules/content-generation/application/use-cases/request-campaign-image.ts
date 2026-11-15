import type { Clock } from '#app/application/ports/clock';
import type { JobQueue } from '#app/application/ports/job-queue';
import type { UnitOfWork } from '#app/application/ports/unit-of-work';
import type {
  CampaignGenerations,
  CampaignReference,
  GeneratedCampaignContent,
} from '#app/modules/campaigns/contract';
import { GENERATE_IMAGE_JOB, publicStatus, type GenerationJobStatus } from '../generation-job.js';
import {
  checkImagePreconditions,
  type ImagePreconditionPorts,
} from '../image-generation-preconditions.js';
import type { CampaignImageRepository } from '../ports/campaign-image-repository.js';

export interface CampaignImageStatus {
  generationId: string;
  status: GenerationJobStatus;
  failureCode: string | null;
  // Presente cuando el flyer ya está registrado y espera aprobación.
  content: Pick<GeneratedCampaignContent, 'id' | 'assetIds'> | null;
}

// Acepta la petición y deja el trabajo a la cola. Pedirlo otra vez mientras un trabajo
// espera o corre no inicia un segundo.
export class RequestCampaignImage {
  constructor(
    private readonly ports: ImagePreconditionPorts,
    private readonly images: CampaignImageRepository,
    private readonly queue: JobQueue,
    private readonly transactions: UnitOfWork,
  ) {}

  async execute(input: CampaignReference & { generationId: string }): Promise<CampaignImageStatus> {
    // Responde ahora los fallos previsibles, en vez de esperar a que falle el trabajo.
    const ready = await checkImagePreconditions(this.ports, input);
    if (ready.done)
      return {
        generationId: ready.done.generationId,
        status: 'READY',
        failureCode: null,
        content: ready.done,
      };
    const { selection, campaign, now } = ready;
    await this.transactions.run(async (transaction) => {
      await this.images.queue(selection, campaign.version, now, transaction);
      await this.queue.enqueue(
        { name: GENERATE_IMAGE_JOB, key: selection.generationId, payload: { ...selection } },
        transaction,
      );
    });
    return {
      generationId: selection.generationId,
      status: 'PENDING',
      failureCode: null,
      content: null,
    };
  }
}

export class GetCampaignImage {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly images: CampaignImageRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CampaignReference): Promise<CampaignImageStatus | null> {
    const campaign = await this.generations.view(input);
    if (!campaign.generation) return null;
    const generationId = campaign.generation.id;
    const content = campaign.candidateContent;
    if (content && content.generationId === generationId)
      return { generationId, status: 'READY', failureCode: null, content };
    const state = await this.images.state(
      { organizationId: campaign.organizationId, campaignId: campaign.campaignId, generationId },
      this.clock.now(),
    );
    // Aún no hay petición, o el trabajo terminado pertenece a un estado que ya se reemplazó.
    if (!state || state.status === 'READY') return null;
    return { generationId, ...publicStatus(state), content: null };
  }
}
