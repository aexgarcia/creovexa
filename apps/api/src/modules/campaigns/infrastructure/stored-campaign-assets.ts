import { FORMAT_SIZES } from '#app/domain/value-objects/flyer-design';
import { createHash } from 'node:crypto';
import { entityId, type EntityId } from '#app/domain/entity-id';
import { inspectImageBytes, MAX_IMAGE_BYTES } from '#app/infrastructure/image-files';
import type {
  CampaignAsset,
  PrismaClient,
} from '#app/infrastructure/persistence/prisma/generated/client';
import {
  ObjectStorageError,
  type ObjectStorage,
} from '#app/modules/assets/application/ports/object-storage';
import { CampaignAssetError } from '../application/errors/campaign-asset.error.js';
import type {
  CampaignFinalAssets,
  CampaignImageSelection,
  StoredCampaignAsset,
} from '../application/ports/campaign-final-assets.js';

// Lee los archivos ya registrados de una campaña. Escribirlos le corresponde a content-generation.
export class StoredCampaignAssets implements CampaignFinalAssets {
  constructor(
    private readonly database: PrismaClient,
    private readonly storage: ObjectStorage,
  ) {}

  get bucket(): string {
    const bucket = this.storage.bucket;
    if (!bucket) throw new CampaignAssetError('UNAVAILABLE');
    return bucket;
  }

  assertAvailable(): void {
    void this.bucket;
  }

  async readFinal(input: CampaignImageSelection & { assetId: EntityId }) {
    const row = await this.database.campaignAsset.findFirst({
      where: {
        id: input.assetId,
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        generationId: input.generationId,
        purpose: 'FINAL_PIECE',
        contentType: 'image/png',
      },
    });
    // El flyer final tiene el tamaño de uno de los formatos (cuadrado, vertical o historia).
    if (
      !row ||
      !Object.values(FORMAT_SIZES).some(
        (size) => size.width === row.width && size.height === row.height,
      )
    )
      return null;
    this.assertAvailable();
    const result = await this.read(input.organizationId, input.assetId);
    if (!result) return null;
    try {
      const actual = await inspectImageBytes(result.bytes);
      if (
        actual.contentType !== 'image/png' ||
        actual.width !== row.width ||
        actual.height !== row.height
      )
        throw new CampaignAssetError('CORRUPTED');
    } catch {
      throw new CampaignAssetError('CORRUPTED');
    }
    return result;
  }

  // Lector interno de archivos propios. Los ajenos parecen inexistentes.
  async read(
    organizationId: EntityId,
    assetId: EntityId,
  ): Promise<{ bytes: Buffer; asset: StoredCampaignAsset } | null> {
    try {
      const row = await this.database.campaignAsset.findFirst({
        where: { id: assetId, organizationId },
      });
      if (!row) return null;
      if (row.bucket !== this.bucket) throw new CampaignAssetError('UNAVAILABLE');
      const bytes = await this.readObject(row.objectKey);
      if (bytes.length !== row.byteLength || sha256(bytes) !== row.sha256)
        throw new CampaignAssetError('CORRUPTED');
      return { bytes, asset: campaignAssetResult(row) };
    } catch (error) {
      if (error instanceof CampaignAssetError) throw error;
      throw new CampaignAssetError('UNAVAILABLE');
    }
  }

  async readObject(key: string): Promise<Buffer> {
    try {
      return await this.storage.read(key, MAX_IMAGE_BYTES);
    } catch (error) {
      if (!(error instanceof ObjectStorageError)) throw error;
      if (error.code === 'TIMEOUT') throw new CampaignAssetError('TIMEOUT');
      if (error.code === 'EMPTY' || error.code === 'TOO_LARGE')
        throw new CampaignAssetError('CORRUPTED');
      throw new CampaignAssetError('UNAVAILABLE');
    }
  }
}

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function campaignAssetResult(row: CampaignAsset): StoredCampaignAsset {
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
