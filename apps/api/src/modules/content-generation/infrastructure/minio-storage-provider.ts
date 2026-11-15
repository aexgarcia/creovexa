import { FORMAT_SIZES } from '#app/domain/value-objects/flyer-design';
import { createHash, randomUUID } from 'node:crypto';
import { inspectImageBytes } from '#app/infrastructure/image-files';
import { entityId, type EntityId } from '#app/domain/entity-id';
import type {
  PrismaClient,
  CampaignAsset,
} from '#app/infrastructure/persistence/prisma/generated/client';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import { CampaignImageError, type CampaignGenerations } from '#app/modules/campaigns/contract';
import type {
  StorageProvider,
  StoreCampaignAssetInput,
  StoredCampaignAsset,
} from '../application/ports/storage-provider.js';
import { MAX_IMAGE_BYTES, LocalImageArtifacts } from './local-image-artifacts.js';
import {
  lockImageCampaign,
  requireImageLease,
} from './persistence/prisma/prisma-campaign-image.repository.js';

// Escribe los archivos que produce una generación y relee los que guardó su propia operación.
export class MinioStorageProvider implements StorageProvider {
  constructor(
    private readonly database: PrismaClient,
    private readonly artifacts: LocalImageArtifacts,
    private readonly storage: ObjectStorage,
    private readonly generations: CampaignGenerations,
  ) {}

  private get bucket(): string {
    const bucket = this.storage.bucket;
    if (!bucket) throw new CampaignImageError('UNAVAILABLE');
    return bucket;
  }

  assertAvailable(): void {
    void this.bucket;
  }

  async store(input: StoreCampaignAssetInput): Promise<StoredCampaignAsset> {
    this.assertAvailable();
    try {
      const selection = {
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        generationId: input.generationId,
      };
      const bytes = await this.artifacts.read(input);
      await validateImage(bytes, input);
      const sha256 = digest(bytes);
      const objectKey = [...Object.values(selection), input.operationId, input.purpose].join('/');
      const where = { ...selection, operationId: input.operationId, purpose: input.purpose };
      const existing = await this.database.campaignAsset.findFirst({ where });
      if (existing) {
        this.assertSame(existing, input, sha256);
        return campaignAssetResult(existing);
      }
      await this.database.$transaction(async (tx) => {
        await lockImageCampaign(this.generations, tx, selection);
        await requireImageLease(tx, selection, input.operationId);
      });
      const created = await this.storage.putIfAbsent({
        key: objectKey,
        bytes,
        contentType: input.source.contentType,
        sha256,
      });
      if (!created) {
        // Una subida anterior pudo completarse antes de confirmar los metadatos. Nunca la sobrescribas.
        const stored = await this.readObject(objectKey);
        if (digest(stored) !== sha256) throw new CampaignImageError('INVALID_OUTPUT');
      }
      return await this.database.$transaction(async (tx) => {
        await lockImageCampaign(this.generations, tx, selection);
        await requireImageLease(tx, selection, input.operationId);
        const previous = await tx.campaignAsset.findFirst({ where });
        if (previous) {
          this.assertSame(previous, input, sha256);
          return campaignAssetResult(previous);
        }
        const row = await tx.campaignAsset.create({
          data: {
            ...where,
            id: randomUUID(),
            bucket: this.bucket,
            objectKey,
            sha256,
            byteLength: bytes.length,
            contentType: input.source.contentType,
            width: input.source.width,
            height: input.source.height,
          },
        });
        return campaignAssetResult(row);
      });
    } catch (error) {
      if (error instanceof CampaignImageError) throw error;
      throw new CampaignImageError('UNAVAILABLE');
    }
  }

  // El compositor relee la imagen base que guardó esta misma operación. Los archivos ajenos parecen inexistentes.
  async read(
    organizationId: EntityId,
    assetId: EntityId,
  ): Promise<{ bytes: Buffer; asset: StoredCampaignAsset } | null> {
    try {
      const row = await this.database.campaignAsset.findFirst({
        where: { id: assetId, organizationId },
      });
      if (!row) return null;
      if (row.bucket !== this.bucket) throw new CampaignImageError('UNAVAILABLE');
      const bytes = await this.readObject(row.objectKey);
      if (bytes.length !== row.byteLength || digest(bytes) !== row.sha256)
        throw new CampaignImageError('INVALID_OUTPUT');
      return { bytes, asset: campaignAssetResult(row) };
    } catch (error) {
      if (error instanceof CampaignImageError) throw error;
      throw new CampaignImageError('UNAVAILABLE');
    }
  }

  private async readObject(key: string): Promise<Buffer> {
    try {
      return await this.storage.read(key, MAX_IMAGE_BYTES);
    } catch (error) {
      if (!(error instanceof ObjectStorageError)) throw error;
      if (error.code === 'TIMEOUT') throw new CampaignImageError('TIMEOUT');
      if (error.code === 'EMPTY' || error.code === 'TOO_LARGE')
        throw new CampaignImageError('INVALID_OUTPUT');
      throw new CampaignImageError('UNAVAILABLE');
    }
  }

  private assertSame(row: CampaignAsset, input: StoreCampaignAssetInput, hash: string): void {
    if (
      row.sha256 !== hash ||
      row.contentType !== input.source.contentType ||
      row.width !== input.source.width ||
      row.height !== input.source.height ||
      row.bucket !== this.bucket
    )
      throw new CampaignImageError('INVALID_OUTPUT');
  }
}

async function validateImage(bytes: Buffer, input: StoreCampaignAssetInput): Promise<void> {
  try {
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error();
    const metadata = await inspectImageBytes(bytes);
    if (
      metadata.contentType !== input.source.contentType ||
      metadata.width !== input.source.width ||
      metadata.height !== input.source.height
    )
      throw new Error();
    if (
      input.purpose === 'FINAL_PIECE' &&
      (metadata.contentType !== 'image/png' || !isFlyerSize(metadata))
    )
      throw new Error();
  } catch {
    throw new CampaignImageError('INVALID_OUTPUT');
  }
}

// El flyer final tiene el tamaño de uno de los formatos de la plantilla.
function isFlyerSize(size: { width: number; height: number }): boolean {
  return Object.values(FORMAT_SIZES).some(
    (format) => format.width === size.width && format.height === size.height,
  );
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function campaignAssetResult(row: CampaignAsset): StoredCampaignAsset {
  return {
    id: entityId(row.id),
    organizationId: entityId(row.organizationId),
    campaignId: entityId(row.campaignId),
    generationId: entityId(row.generationId),
    purpose: row.purpose,
    contentType: row.contentType as StoredCampaignAsset['contentType'],
    width: row.width,
    height: row.height,
  };
}
