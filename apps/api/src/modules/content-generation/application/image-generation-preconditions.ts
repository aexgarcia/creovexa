import type { Clock } from '#app/application/ports/clock';
import {
  CampaignImageError,
  InvalidCampaignTransitionError,
  type CampaignGenerations,
  type CampaignGenerationView,
  type CampaignReference,
  type GeneratedCampaignContent,
  type GenerationReference,
  type GenerationSnapshotData,
} from '#app/modules/campaigns/contract';
import type { CampaignCopyRepository } from './ports/campaign-copy-repository.js';
import type { CampaignCopy } from './ports/copy-generator.js';
import type { ImageGenerator } from './ports/image-generator.js';
import type { ProductImageSource } from './ports/product-image-source.js';
import type { StorageProvider } from './ports/storage-provider.js';
import type { TemplateRenderer } from './ports/template-renderer.js';

export interface ImagePreconditionPorts {
  generations: CampaignGenerations;
  copies: CampaignCopyRepository;
  productImages: ProductImageSource;
  generator: ImageGenerator;
  renderer: TemplateRenderer;
  storage: StorageProvider;
  clock: Clock;
}

export type ImagePreconditions =
  | { done: GeneratedCampaignContent }
  | {
      done: null;
      campaign: CampaignGenerationView;
      selection: GenerationReference;
      snapshot: GenerationSnapshotData;
      copy: CampaignCopy;
      now: Date;
    };

// Everything that must hold before image work starts. The request checks it to answer at
// once; the job checks it again because the campaign may have changed while it waited.
export async function checkImagePreconditions(
  ports: ImagePreconditionPorts,
  input: CampaignReference & { generationId: string },
): Promise<ImagePreconditions> {
  const campaign = await ports.generations.view(input, input.generationId);
  const generation = campaign.generation!;
  if (campaign.candidateContent) return { done: campaign.candidateContent };
  if (campaign.status !== 'GENERATING') throw new InvalidCampaignTransitionError();
  const selection = {
    organizationId: campaign.organizationId,
    campaignId: campaign.campaignId,
    generationId: generation.id,
  };
  const copy = await ports.copies.find(selection);
  if (!copy) throw new CampaignImageError('COPY_REQUIRED');
  // Copy was validated and frozen in phase 5. Do not reinterpret it using a newer copy policy.
  if (copy.cta !== generation.snapshot.cta) throw new CampaignImageError('INVALID_OUTPUT');
  if (typeof copy.imagePrompt !== 'string' || !copy.imagePrompt.trim())
    throw new CampaignImageError('INVALID_OUTPUT');
  const snapshot = generation.snapshot;
  if (snapshot.product.imageAssetIds.length === 0)
    throw new CampaignImageError('PRODUCT_IMAGE_REQUIRED');
  if (snapshot.product.imageAssetIds.length !== 1) throw new CampaignImageError('INVALID_OUTPUT');
  if (snapshot.template.width !== 1080 || snapshot.template.height !== 1080)
    throw new CampaignImageError('UNSUPPORTED_DIMENSIONS');
  ports.productImages.assertAvailable();
  ports.generator.assertAvailable();
  ports.renderer.assertAvailable();
  ports.storage.assertAvailable();
  const now = ports.clock.now();
  await ports.generations.assertPromotionActive(input, now);
  return { done: null, campaign, selection, snapshot, copy, now };
}
