import { randomUUID } from 'node:crypto';
import { inspectImageBytes } from '#app/infrastructure/image-files';
import type { EntityId } from '#app/domain/entity-id';
import type {
  PrismaClient,
  CampaignAsset,
} from '#app/infrastructure/persistence/prisma/generated/client';
import type { ObjectStorage } from '#app/modules/assets/application/ports/object-storage';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import {
  StoredCampaignAssets,
  campaignAssetResult,
  sha256 as digest,
} from '#app/modules/campaigns/infrastructure/stored-campaign-assets';
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

// Writes the assets a generation produces. Reading recorded assets belongs to campaigns.
export class MinioStorageProvider implements StorageProvider {
  private readonly assets: StoredCampaignAssets;

  constructor(
    private readonly database: PrismaClient,
    private readonly artifacts: LocalImageArtifacts,
    private readonly storage: ObjectStorage,
  ) {
    this.assets = new StoredCampaignAssets(database, storage);
  }

  assertAvailable(): void {
    this.assets.assertAvailable();
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
        await lockImageCampaign(tx, selection);
        await requireImageLease(tx, selection, input.operationId);
      });
      const created = await this.storage.putIfAbsent({
        key: objectKey,
        bytes,
        contentType: input.source.contentType,
        sha256,
      });
      if (!created) {
        // An earlier upload may have succeeded before metadata committed. Never overwrite it.
        const stored = await this.assets.readObject(objectKey);
        if (digest(stored) !== sha256) throw new CampaignImageError('INVALID_OUTPUT');
      }
      return await this.database.$transaction(async (tx) => {
        await lockImageCampaign(tx, selection);
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
            bucket: this.assets.bucket,
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

  // The renderer reads back the base image this same operation stored.
  read(organizationId: EntityId, assetId: EntityId) {
    return this.assets.read(organizationId, assetId);
  }

  private assertSame(row: CampaignAsset, input: StoreCampaignAssetInput, hash: string): void {
    if (
      row.sha256 !== hash ||
      row.contentType !== input.source.contentType ||
      row.width !== input.source.width ||
      row.height !== input.source.height ||
      row.bucket !== this.assets.bucket
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
      (metadata.contentType !== 'image/png' || metadata.width !== 1080 || metadata.height !== 1080)
    )
      throw new Error();
  } catch {
    throw new CampaignImageError('INVALID_OUTPUT');
  }
}
