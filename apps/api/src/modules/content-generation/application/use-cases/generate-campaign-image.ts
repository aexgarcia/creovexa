import { ImageGenerationError } from '#app/modules/content-generation/application/errors/image-generation.error';
import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import {
  type CampaignGenerations,
  type CampaignReference,
  type GeneratedCampaignContent,
} from '#app/modules/campaigns/contract';
import { checkImagePreconditions } from '../image-generation-preconditions.js';
import type { CampaignCopyRepository } from '../ports/campaign-copy-repository.js';
import type {
  CampaignImageLease,
  CampaignImageRepository,
} from '../ports/campaign-image-repository.js';
import type { ImageArtifact, TemporaryArtifacts } from '../ports/image-artifact.js';
import type { ImageGenerator } from '../ports/image-generator.js';
import type { ProductImageSource } from '../ports/product-image-source.js';
import type {
  StorageProvider,
  StoredCampaignAsset,
  CampaignAssetPurpose,
} from '../ports/storage-provider.js';
import type { TemplateRenderer } from '../ports/template-renderer.js';
import type { FlyerLogoSource } from '../ports/flyer-logo-source.js';
import type { FlyerReader } from '../ports/flyer-reader.js';
import type { FlyerStyleSource } from '../ports/flyer-style-source.js';
import { buildFlyerBrief, chooseFlyerLogo, snapshotDesign } from '../flyer-brief.js';
import { verifyFlyer, type FlyerVerification } from '../flyer-verification.js';

// Lo que se informa de cada verificación de AI_FULL, para entender por qué falló una imagen.
export interface FlyerVerificationReport {
  generationId: string;
  verification: FlyerVerification;
  warnings: string[];
  logoPlacement: 'DIRECT' | 'VEIL' | null;
}

// Dependencias que no todos los despliegues tienen.
export interface GenerateCampaignImageOptions {
  // Solo en AI_FULL (ADR-0009): el logo que se pega y la lectura que verifica el flyer.
  logos?: FlyerLogoSource | null;
  reader?: FlyerReader | null;
  styles?: FlyerStyleSource | null;
  report?: (report: FlyerVerificationReport) => void;
  // Archivos temporales de cada operación, que se borran al terminarla.
  temporary?: TemporaryArtifacts | null;
}

export interface GenerateCampaignImageInput extends CampaignReference {
  // Fija la generación del copy revisado; nunca genera en silencio una revisión más nueva.
  generationId: string;
}

function assertArtifact(artifact: ImageArtifact) {
  if (
    !artifact ||
    typeof artifact.reference !== 'string' ||
    !artifact.reference.trim() ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(artifact.contentType) ||
    ![artifact.width, artifact.height].every((value) => Number.isSafeInteger(value) && value > 0)
  )
    throw new ImageGenerationError('INVALID_OUTPUT');
}

function assertStoredAsset(
  asset: StoredCampaignAsset,
  lease: CampaignImageLease,
  purpose: CampaignAssetPurpose,
  source: ImageArtifact,
) {
  if (
    !asset ||
    asset.organizationId !== lease.organizationId ||
    asset.campaignId !== lease.campaignId ||
    asset.generationId !== lease.generationId ||
    asset.purpose !== purpose ||
    asset.width !== source.width ||
    asset.height !== source.height ||
    asset.contentType !== source.contentType
  )
    throw new ImageGenerationError('INVALID_OUTPUT');
  try {
    entityId(asset.id, 'assetId');
  } catch {
    throw new ImageGenerationError('INVALID_OUTPUT');
  }
}

export class GenerateCampaignImage {
  constructor(
    readonly generations: CampaignGenerations,
    readonly copies: CampaignCopyRepository,
    private readonly images: CampaignImageRepository,
    readonly productImages: ProductImageSource,
    readonly generator: ImageGenerator,
    readonly renderer: TemplateRenderer,
    readonly storage: StorageProvider,
    private readonly ids: IdGenerator,
    readonly clock: Clock,
    options: GenerateCampaignImageOptions = {},
  ) {
    this.logos = options.logos ?? null;
    this.reader = options.reader ?? null;
    this.styles = options.styles ?? null;
    this.report = options.report ?? (() => {});
    this.temporary = options.temporary ?? null;
  }

  readonly logos: FlyerLogoSource | null;
  readonly reader: FlyerReader | null;
  private readonly styles: FlyerStyleSource | null;
  private readonly report: (report: FlyerVerificationReport) => void;
  private readonly temporary: TemporaryArtifacts | null;

  async execute(input: GenerateCampaignImageInput): Promise<GeneratedCampaignContent> {
    const ready = await checkImagePreconditions(this, input);
    if (ready.done) return ready.done;
    const { campaign, selection, snapshot, copy, now } = ready;
    const lease: CampaignImageLease = {
      ...selection,
      token: entityId(this.ids.next()),
      expectedVersion: campaign.version,
      now,
      expiresAt: new Date(now.getTime() + 300000),
    };
    if (!(await this.images.claim(lease))) throw new ImageGenerationError('BUSY');
    try {
      this.assertLeaseTime(lease);
      const referenceImage = await this.productImages.load({
        ...selection,
        operationId: lease.token,
        productId: snapshot.product.id,
        imageAssetId: snapshot.product.imageAssetIds[0],
      });
      assertArtifact(referenceImage);
      this.assertLeaseTime(lease);
      const operation = { ...selection, operationId: lease.token };
      const choice = this.logos ? chooseFlyerLogo(snapshot) : null;
      const logo = choice
        ? await this.logos!.load({ ...operation, assetId: entityId(choice.assetId) })
        : null;
      if (logo) assertArtifact(logo);
      const styleImages: ImageArtifact[] = [];
      if (this.styles)
        for (const assetId of snapshotDesign(snapshot).styleReferenceAssetIds) {
          const image = await this.styles.load({
            ...operation,
            templateId: snapshot.template.id,
            assetId: entityId(assetId),
          });
          assertArtifact(image);
          styleImages.push(image);
        }
      this.assertLeaseTime(lease);
      const brief = buildFlyerBrief(
        snapshot,
        copy,
        choice && logo ? { ...choice, aspectRatio: logo.width / logo.height } : null,
        styleImages.length,
      );
      const visualCopy = {
        headline: copy.headline,
        subheadline: copy.subheadline,
        caption: copy.caption,
        cta: copy.cta,
        hashtags: [...copy.hashtags],
      };
      const base = await this.generator.generate({
        ...selection,
        operationId: lease.token,
        referenceImage,
        headline: copy.headline,
        brief,
        styleImages,
        snapshot,
      });
      assertArtifact(base);
      this.assertLeaseTime(lease);
      const baseAsset = await this.storage.store({
        ...selection,
        operationId: lease.token,
        purpose: 'BASE_IMAGE',
        source: base,
      });
      assertStoredAsset(baseAsset, lease, 'BASE_IMAGE', base);
      this.assertLeaseTime(lease);
      const composition = await this.renderer.render({
        ...operation,
        mainImage: baseAsset.id,
        baseImage: base,
        copy: visualCopy,
        brief,
        logo,
        snapshot,
      });
      const final = composition.final;
      assertArtifact(final);
      if (
        final.contentType !== 'image/png' ||
        final.width !== snapshot.template.width ||
        final.height !== snapshot.template.height
      )
        throw new ImageGenerationError('INVALID_OUTPUT');
      this.assertLeaseTime(lease);
      if (this.reader) {
        // Primero la esquina, en la imagen de la IA: el modelo de visión completa las letras
        // que el logo corta y la lectura del flyer final no lo notaría.
        const review = composition.areaUnderLogo
          ? await this.reader.reviewLogoArea({ ...operation, image: composition.areaUnderLogo })
          : null;
        this.assertLeaseTime(lease);
        const reading = await this.reader.read({ ...operation, image: final });
        const verification = verifyFlyer(brief, reading, review);
        this.report({
          generationId: selection.generationId,
          verification,
          warnings: brief.warnings,
          logoPlacement: composition.logoPlacement,
        });
        // No se reintenta: cada intento se cobra (ADR-0008). Quien la pidió puede regenerarla.
        if (!verification.ok) throw new ImageGenerationError('VERIFICATION_FAILED');
        this.assertLeaseTime(lease);
      }
      const finalAsset = await this.storage.store({
        ...selection,
        operationId: lease.token,
        purpose: 'FINAL_PIECE',
        source: final,
      });
      assertStoredAsset(finalAsset, lease, 'FINAL_PIECE', final);
      if (baseAsset.id === finalAsset.id) throw new ImageGenerationError('INVALID_OUTPUT');
      this.assertLeaseTime(lease);
      const at = this.clock.now();
      // Campaigns registra el contenido dentro de la misma transacción que cierra la reserva.
      return await this.images.complete(lease, { copy: visualCopy, baseAsset, finalAsset }, at);
    } catch (error) {
      // Nunca borres archivos aquí: el commit pudo completarse antes de un fallo de red.
      // El vencimiento recupera la reserva si el repositorio no responde por un momento.
      try {
        await this.images.release(lease);
      } catch {
        /* Conserva el fallo original. */
      }
      throw error;
    } finally {
      // Lo que importa ya quedó en el storage; los temporales de esta operación sobran.
      await this.temporary
        ?.discard({ ...selection, operationId: lease.token })
        .catch(() => undefined);
    }
  }

  private assertLeaseTime(lease: CampaignImageLease) {
    if (this.clock.now().getTime() >= lease.expiresAt.getTime())
      throw new ImageGenerationError('TIMEOUT');
  }
}
