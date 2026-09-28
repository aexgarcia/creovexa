import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { CampaignStatus } from '../../domain/campaign-status.js';
import { InvalidCampaignTransitionError } from '../../domain/errors/campaign.errors.js';
import type { CampaignRepository } from '../../domain/repositories/campaign.repository.js';
import { GenerationSnapshot } from '../../domain/value-objects/generation-snapshot.js';
import { loadCampaign, type CampaignSelection } from '../load-campaign.js';
import { loadCampaignResources } from '../load-campaign-resources.js';
import type { CampaignLookups } from '../ports/campaign-lookups.js';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import { CopyGenerationError, type CopyGenerator } from '../ports/copy-generator.js';
import { validateCopy } from '../copy-policy.js';
export class GenerateCampaignCopy {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly lookups: CampaignLookups,
    private readonly copies: CampaignCopyRepository,
    private readonly generator: CopyGenerator,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}
  async execute(input: CampaignSelection) {
    let campaign = await loadCampaign(input, this.campaigns);
    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.GENERATING)
      throw new InvalidCampaignTransitionError();
    if (campaign.generation) {
      const saved = await this.copies.find({
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        generationId: campaign.generation.id,
      });
      if (saved) return { generationId: campaign.generation.id, ...saved };
    }
    this.generator.assertAvailable();
    if (campaign.status === CampaignStatus.DRAFT) {
      const resources = await loadCampaignResources(campaign, this.lookups);
      const snapshot = GenerationSnapshot.capture(
        resources,
        campaign.instructions,
        campaign.cta,
        campaign.promotion,
      );
      const updated = campaign.requestGeneration(this.ids.next(), snapshot, this.clock.now());
      await this.campaigns.save(campaign.organizationId, updated, campaign.version);
      campaign = updated;
    }
    const generation = campaign.generation!;
    const now = this.clock.now();
    const lease = {
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      generationId: generation.id,
      token: entityId(this.ids.next()),
      now,
      expiresAt: new Date(now.getTime() + 120000),
    };
    if (!(await this.copies.claim(lease))) throw new CopyGenerationError('BUSY');
    try {
      const content = validateCopy(
        await this.generator.generate(generation.snapshot.data),
        generation.snapshot.data,
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
    private readonly campaigns: CampaignRepository,
    private readonly copies: CampaignCopyRepository,
  ) {}
  async execute(input: CampaignSelection) {
    const campaign = await loadCampaign(input, this.campaigns);
    if (!campaign.generation) return null;
    const content = await this.copies.find({
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      generationId: campaign.generation.id,
    });
    return content ? { generationId: campaign.generation.id, ...content } : null;
  }
}
