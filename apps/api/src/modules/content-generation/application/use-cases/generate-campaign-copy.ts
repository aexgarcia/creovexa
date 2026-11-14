import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import {
  InvalidCampaignTransitionError,
  type CampaignGenerations,
  type CampaignReference,
} from '#app/modules/campaigns/contract';
import { publicStatus, type GenerationJobStatus } from '../generation-job.js';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import {
  CopyGenerationError,
  type CampaignCopy,
  type CopyGenerator,
} from '../ports/copy-generator.js';
import { validateCopy } from '../copy-policy.js';

export interface CampaignCopyStatus {
  generationId: string;
  status: GenerationJobStatus;
  failureCode: string | null;
  copy: CampaignCopy | null;
}

// Executes the copy job. Safe to run again: finished copy is returned, not regenerated.
export class GenerateCampaignCopy {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly copies: CampaignCopyRepository,
    private readonly generator: CopyGenerator,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  // With generationId, a job left behind by an older generation fails instead of running.
  async execute(input: CampaignReference & { generationId?: string }) {
    let campaign = await this.generations.view(input, input.generationId);
    if (campaign.status !== 'DRAFT' && campaign.status !== 'GENERATING')
      throw new InvalidCampaignTransitionError();
    if (campaign.generation) {
      const saved = await this.copies.find({
        organizationId: campaign.organizationId,
        campaignId: campaign.campaignId,
        generationId: campaign.generation.id,
      });
      if (saved) return { generationId: campaign.generation.id, ...saved };
    }
    this.generator.assertAvailable();
    if (campaign.status === 'DRAFT') campaign = await this.generations.begin(input);
    const generation = campaign.generation!;
    const now = this.clock.now();
    const lease = {
      organizationId: campaign.organizationId,
      campaignId: campaign.campaignId,
      generationId: generation.id,
      token: entityId(this.ids.next()),
      now,
      expiresAt: new Date(now.getTime() + 120000),
    };
    if (!(await this.copies.claim(lease))) throw new CopyGenerationError('BUSY');
    try {
      const content = validateCopy(
        await this.generator.generate(generation.snapshot),
        generation.snapshot,
      );
      await this.copies.complete(lease, content);
      return { generationId: generation.id, ...content };
    } catch (error) {
      await this.copies.release(lease);
      throw error;
    }
  }
}

export class GetCampaignCopy {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly copies: CampaignCopyRepository,
    private readonly clock: Clock,
  ) {}
  async execute(input: CampaignReference): Promise<CampaignCopyStatus | null> {
    const campaign = await this.generations.view(input);
    if (!campaign.generation) return null;
    const selection = {
      organizationId: campaign.organizationId,
      campaignId: campaign.campaignId,
      generationId: campaign.generation.id,
    };
    const state = await this.copies.state(selection, this.clock.now());
    if (!state) return null;
    return {
      generationId: selection.generationId,
      ...publicStatus(state),
      copy: state.status === 'READY' ? await this.copies.find(selection) : null,
    };
  }
}
