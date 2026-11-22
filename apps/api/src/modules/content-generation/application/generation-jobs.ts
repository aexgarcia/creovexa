import { ImageGenerationError } from '#app/modules/content-generation/application/errors/image-generation.error';
import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import {
  StaleGenerationResultError,
  type GenerationReference,
} from '#app/modules/campaigns/contract';
import type { CampaignCopyRepository } from './ports/campaign-copy-repository.js';
import type { CampaignImageRepository } from './ports/campaign-image-repository.js';
import { CopyGenerationError } from './ports/copy-generator.js';
import type { GenerateCampaignCopy } from './use-cases/generate-campaign-copy.js';
import type { GenerateCampaignImage } from './use-cases/generate-campaign-image.js';

// Falla que se muestra cuando la causa no es uno de los errores de generación conocidos.
const UNEXPECTED = 'FAILED';

// Ejecuta las generaciones encoladas y deja el motivo de un fallo donde el CMS pueda leerlo.
export class GenerationJobs {
  constructor(
    private readonly generateCopy: GenerateCampaignCopy,
    private readonly generateImage: GenerateCampaignImage,
    private readonly copies: CampaignCopyRepository,
    private readonly images: CampaignImageRepository,
    private readonly clock: Clock,
  ) {}

  async copy(payload: Record<string, unknown>): Promise<void> {
    const generation = reference(payload);
    try {
      await this.generateCopy.execute(generation);
    } catch (error) {
      // Otro worker tiene el trabajo, o la campaña ya avanzó: no hay nada que informar.
      if (error instanceof CopyGenerationError && error.code === 'BUSY') return;
      if (error instanceof StaleGenerationResultError) return;
      const code = error instanceof CopyGenerationError ? error.code : UNEXPECTED;
      await this.copies.fail(generation, code, this.clock.now());
      throw error;
    }
  }

  async image(payload: Record<string, unknown>): Promise<void> {
    const generation = reference(payload);
    try {
      await this.generateImage.execute({
        ...generation,
        quality: payload.quality === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      });
    } catch (error) {
      if (error instanceof ImageGenerationError && ['BUSY', 'STALE_RESULT'].includes(error.code))
        return;
      if (error instanceof StaleGenerationResultError) return;
      const code = error instanceof ImageGenerationError ? error.code : UNEXPECTED;
      await this.images.fail(generation, code, this.clock.now());
      throw error;
    }
  }
}

function reference(payload: Record<string, unknown>): GenerationReference {
  return {
    organizationId: entityId(String(payload.organizationId), 'organizationId'),
    campaignId: entityId(String(payload.campaignId), 'campaignId'),
    generationId: entityId(String(payload.generationId), 'generationId'),
  };
}
