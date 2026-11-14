import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import {
  InvalidCampaignTransitionError,
  type CampaignGenerations,
  type CampaignReference,
} from '#app/modules/campaigns/contract';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import { CopyGenerationError, type CopyGenerator } from '../ports/copy-generator.js';
import { validateCopy } from '../copy-policy.js';
export class GenerateCampaignCopy {
  constructor(
    private readonly generations: CampaignGenerations,
    private readonly copies: CampaignCopyRepository,
    private readonly generator: CopyGenerator,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  async execute(input: CampaignReference) {
    let campaign = await this.generations.view(input);
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
  ) {}
  async execute(input: CampaignReference) {
    const campaign = await this.generations.view(input);
    if (!campaign.generation) return null;
    const content = await this.copies.find({
      organizationId: campaign.organizationId,
      campaignId: campaign.campaignId,
      generationId: campaign.generation.id,
    });
    return content ? { generationId: campaign.generation.id, ...content } : null;
  }
}
