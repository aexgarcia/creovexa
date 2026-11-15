import type { Clock } from '#app/application/ports/clock';
import {
  InvalidCampaignTransitionError,
  type CampaignGenerations,
  type CampaignReference,
} from '#app/modules/campaigns/contract';
import { flyerTextsProblem, normalizeFlyerTexts } from '../copy-policy.js';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import { InvalidFlyerTextError } from '../ports/copy-generator.js';
import type { CampaignCopyStatus } from './generate-campaign-copy.js';

export interface UpdateCampaignCopyInput extends CampaignReference {
  generationId: string;
  headline: string;
  subheadline: string | null;
}

// El usuario corrige titular y subtítulo antes de pedir la imagen: corregir un texto antes
// no cuesta nada; después cuesta otra imagen. Caption, hashtags y CTA no se tocan.
export class UpdateCampaignCopy {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly copies: CampaignCopyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateCampaignCopyInput): Promise<CampaignCopyStatus> {
    // Con generationId, falla con STALE_GENERATION si ya no es la vigente.
    const campaign = await this.generations.view(input, input.generationId);
    if (campaign.status !== 'GENERATING' || campaign.candidateContent)
      throw new InvalidCampaignTransitionError();
    const generation = campaign.generation!;
    const texts = normalizeFlyerTexts(input);
    const problem = flyerTextsProblem(texts, generation.snapshot);
    if (problem) throw new InvalidFlyerTextError(problem);
    const selection = {
      organizationId: campaign.organizationId,
      campaignId: campaign.campaignId,
      generationId: generation.id,
    };
    const result = await this.copies.editFlyerTexts(selection, texts, this.clock.now());
    if (result !== 'UPDATED') throw new InvalidCampaignTransitionError();
    return {
      generationId: generation.id,
      status: 'READY',
      failureCode: null,
      copy: await this.copies.find(selection),
    };
  }
}
