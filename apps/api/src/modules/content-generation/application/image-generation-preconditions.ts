import { ImageGenerationError } from '#app/modules/content-generation/application/errors/image-generation.error';
import type { Clock } from '#app/application/ports/clock';
import {
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
import type { FlyerLogoSource } from './ports/flyer-logo-source.js';
import type { FlyerReader } from './ports/flyer-reader.js';
import { snapshotDesign } from './flyer-brief.js';
import { FORMAT_SIZES } from '#app/domain/value-objects/flyer-design';

export interface ImagePreconditionPorts {
  generations: CampaignGenerations;
  copies: CampaignCopyRepository;
  productImages: ProductImageSource;
  generator: ImageGenerator;
  renderer: TemplateRenderer;
  storage: StorageProvider;
  // Solo en AI_FULL: el logo que se pega y la lectura que verifica el flyer.
  logos: FlyerLogoSource | null;
  reader: FlyerReader | null;
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

// Todo lo que debe cumplirse antes de empezar la imagen. La petición lo revisa para responder
// de inmediato; el trabajo lo vuelve a revisar porque la campaña pudo cambiar mientras esperaba.
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
  if (!copy) throw new ImageGenerationError('COPY_REQUIRED');
  // El copy se validó y congeló en la fase 5. No se reinterpreta con una política de copy más nueva.
  if (copy.cta !== generation.snapshot.cta) throw new ImageGenerationError('INVALID_OUTPUT');
  const snapshot = generation.snapshot;
  if (snapshot.product.imageAssetIds.length === 0)
    throw new ImageGenerationError('PRODUCT_IMAGE_REQUIRED');
  if (snapshot.product.imageAssetIds.length !== 1) throw new ImageGenerationError('INVALID_OUTPUT');
  // El tamaño congelado debe ser el de su formato y el compositor del despliegue debe soportarlo.
  const size = { width: snapshot.template.width, height: snapshot.template.height };
  const expected = FORMAT_SIZES[snapshotDesign(snapshot).format];
  if (
    size.width !== expected.width ||
    size.height !== expected.height ||
    !ports.renderer.supports(size)
  )
    throw new ImageGenerationError('UNSUPPORTED_DIMENSIONS');
  ports.productImages.assertAvailable();
  ports.logos?.assertAvailable();
  ports.reader?.assertAvailable();
  ports.generator.assertAvailable();
  ports.renderer.assertAvailable();
  ports.storage.assertAvailable();
  const now = ports.clock.now();
  await ports.generations.assertPromotionActive(input, now);
  return { done: null, campaign, selection, snapshot, copy, now };
}
