import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type {
  CampaignGenerations,
  CampaignGenerationView,
  CampaignReference,
  GeneratedCampaignContent,
  GenerationReference,
  RecordGeneratedContentInput,
} from '../contract.js';
import type { Campaign } from '../domain/entities/campaign.js';
import { GeneratedContent } from '../domain/entities/generated-content.js';
import {
  CampaignNotFoundError,
  StaleGenerationResultError,
} from '../domain/errors/campaign.errors.js';
import type { CampaignRepository } from '../domain/repositories/campaign.repository.js';
import { GenerationSnapshot } from '../domain/value-objects/generation-snapshot.js';
import { loadCampaign } from './load-campaign.js';
import { loadCampaignResources } from './load-campaign-resources.js';
import type { CampaignLookups } from './ports/campaign-lookups.js';
import type { CampaignWorkspace } from './ports/campaign-workspace.js';

// What campaigns offers to the module that executes a generation. It translates between
// the campaign aggregate and the plain data of the published contract.
export class PublishedCampaignGenerations implements CampaignGenerations {
  constructor(
    private readonly campaigns: CampaignRepository,
    private readonly lookups: CampaignLookups,
    private readonly workspace: CampaignWorkspace,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async view(reference: CampaignReference, generationId?: string) {
    const campaign = await loadCampaign(reference, this.campaigns);
    if (generationId !== undefined) campaign.requireGeneration(generationId);
    return generationView(campaign);
  }

  async begin(reference: CampaignReference, transaction?: TransactionContext) {
    const campaigns = transaction ? this.workspace.repositoryIn(transaction) : this.campaigns;
    const campaign = await loadCampaign(reference, campaigns);
    const resources = await loadCampaignResources(campaign, this.lookups);
    const snapshot = GenerationSnapshot.capture(
      resources,
      campaign.instructions,
      campaign.cta,
      campaign.promotion,
    );
    const updated = campaign.requestGeneration(this.ids.next(), snapshot, this.clock.now());
    await campaigns.save(campaign.organizationId, updated, campaign.version);
    return generationView(updated);
  }

  async assertPromotionActive(reference: CampaignReference, at: Date) {
    (await loadCampaign(reference, this.campaigns)).promotion?.assertNotExpired(at);
  }

  lock(generation: GenerationReference, transaction: TransactionContext, expectedVersion?: number) {
    return this.workspace.lock(generation, transaction, expectedVersion);
  }

  async recordContent(input: RecordGeneratedContentInput, transaction: TransactionContext) {
    const campaigns = this.workspace.repositoryIn(transaction);
    const campaign = await campaigns.findById(input.organizationId, input.campaignId);
    if (!campaign) throw new CampaignNotFoundError();
    if (campaign.version !== input.expectedVersion) throw new StaleGenerationResultError();
    const generation = campaign.requireGeneration(input.generationId);
    campaign.promotion?.assertNotExpired(input.at);
    const content = GeneratedContent.create(
      {
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        generationId: generation.id,
        id: this.ids.next(),
        revision: generation.number,
      },
      generation.snapshot,
      {
        headline: input.copy.headline,
        caption: input.copy.caption,
        cta: input.copy.cta,
        hashtags: input.copy.hashtags,
        assetIds: [input.finalAssetId],
      },
      input.at,
    );
    const updated = campaign.recordGeneratedContent(content, input.at);
    await campaigns.save(campaign.organizationId, updated, input.expectedVersion);
    return contentView(content);
  }
}

function generationView(campaign: Campaign): CampaignGenerationView {
  return {
    organizationId: campaign.organizationId,
    campaignId: campaign.id,
    status: campaign.status,
    version: campaign.version,
    generation: campaign.generation && {
      id: campaign.generation.id,
      number: campaign.generation.number,
      snapshot: campaign.generation.snapshot.data,
    },
    candidateContent: campaign.candidateContent && contentView(campaign.candidateContent),
  };
}

function contentView(content: GeneratedContent): GeneratedCampaignContent {
  return {
    id: content.id,
    organizationId: content.organizationId,
    campaignId: content.campaignId,
    generationId: content.generationId,
    revision: content.revision,
    headline: content.headline,
    caption: content.caption,
    cta: content.cta,
    hashtags: content.hashtags,
    assetIds: content.assetIds,
  };
}
