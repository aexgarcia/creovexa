import { createHash, randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { inspectImageBytes } from '#app/infrastructure/image-files';
import { entityId, type EntityId } from '#app/domain/entity-id';
import type { StorageConfig } from '#app/config/storage.config';
import type {
  PrismaClient,
  CampaignAsset,
} from '#app/infrastructure/persistence/prisma/generated/client';
import { CampaignImageError } from '../application/errors/campaign-image.error.js';
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

export class MinioStorageProvider implements StorageProvider {
  private readonly client: S3Client | null;
  constructor(
    private readonly database: PrismaClient,
    private readonly artifacts: LocalImageArtifacts,
    private readonly settings: StorageConfig | null,
  ) {
    this.client = settings
      ? new S3Client({
          endpoint: settings.endpoint,
          region: settings.region,
          forcePathStyle: true,
          credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
          },
          maxAttempts: 2,
        })
      : null;
  }

  private get config(): StorageConfig {
    if (!this.settings) throw new CampaignImageError('UNAVAILABLE');
    return this.settings;
  }

  assertAvailable(): void {
    if (
      !this.config.bucket ||
      !this.config.endpoint ||
      !this.config.accessKeyId ||
      !this.config.secretAccessKey
    )
      throw new CampaignImageError('UNAVAILABLE');
  }

  close(): void {
    this.client?.destroy();
  }

  onModuleDestroy(): void {
    this.close();
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
        return assetResult(existing);
      }
      await this.database.$transaction(async (tx) => {
        await lockImageCampaign(tx, selection);
        await requireImageLease(tx, selection, input.operationId);
      });
      try {
        await this.client!.send(
          new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: objectKey,
            Body: bytes,
            ContentType: input.source.contentType,
            ContentLength: bytes.length,
            IfNoneMatch: '*',
            Metadata: { sha256 },
          }),
          { abortSignal: AbortSignal.timeout(30_000) },
        );
      } catch (error) {
        if (!isPreconditionFailure(error)) throw error;
        // An earlier upload may have succeeded before metadata committed. Never overwrite it.
        const stored = await this.readObject(objectKey);
        if (digest(stored) !== sha256) throw new CampaignImageError('INVALID_OUTPUT');
      }
      return await this.database.$transaction(async (tx) => {
        await lockImageCampaign(tx, selection);
        await requireImageLease(tx, selection, input.operationId);
        const previous = await tx.campaignAsset.findFirst({ where });
        if (previous) {
          this.assertSame(previous, input, sha256);
          return assetResult(previous);
        }
        const row = await tx.campaignAsset.create({
          data: {
            ...where,
            id: randomUUID(),
            bucket: this.config.bucket,
            objectKey,
            sha256,
            byteLength: bytes.length,
            contentType: input.source.contentType,
            width: input.source.width,
            height: input.source.height,
          },
        });
        return assetResult(row);
      });
    } catch (error) {
      if (error instanceof CampaignImageError) throw error;
      throw new CampaignImageError('UNAVAILABLE');
    }
  }

  async readFinal(input: {
    organizationId: EntityId;
    campaignId: EntityId;
    generationId: EntityId;
    assetId: EntityId;
  }) {
    const row = await this.database.campaignAsset.findFirst({
      where: {
        id: input.assetId,
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        generationId: input.generationId,
        purpose: 'FINAL_PIECE',
        contentType: 'image/png',
        width: 1080,
        height: 1080,
      },
    });
    if (!row) return null;
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
        throw new CampaignImageError('INVALID_OUTPUT');
    } catch {
      throw new CampaignImageError('INVALID_OUTPUT');
    }
    return result;
  }

  // Internal reader for owned assets. Foreign assets look absent.
  async read(
    organizationId: EntityId,
    assetId: EntityId,
  ): Promise<{ bytes: Buffer; asset: StoredCampaignAsset } | null> {
    try {
      const row = await this.database.campaignAsset.findFirst({
        where: { id: assetId, organizationId },
      });
      if (!row) return null;
      if (row.bucket !== this.config.bucket) throw new CampaignImageError('UNAVAILABLE');
      const bytes = await this.readObject(row.objectKey);
      if (bytes.length !== row.byteLength || digest(bytes) !== row.sha256)
        throw new CampaignImageError('INVALID_OUTPUT');
      return { bytes, asset: assetResult(row) };
    } catch (error) {
      if (error instanceof CampaignImageError) throw error;
      throw new CampaignImageError('UNAVAILABLE');
    }
  }

  private async readObject(key: string): Promise<Buffer> {
    const deadline = AbortSignal.timeout(30_000);
    const response = await this.client!.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      {
        abortSignal: deadline,
      },
    );
    if (!response.Body || deadline.aborted) throw new CampaignImageError('INVALID_OUTPUT');
    const stream = response.Body.transformToWebStream();
    const reader = stream.getReader();
    const cancel = () => {
      void reader.cancel().catch(() => {});
    };
    deadline.addEventListener('abort', cancel, { once: true });
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (deadline.aborted) throw new CampaignImageError('TIMEOUT');
        if (done) break;
        length += value.byteLength;
        if (length > MAX_IMAGE_BYTES) throw new CampaignImageError('INVALID_OUTPUT');
        chunks.push(value);
      }
    } finally {
      deadline.removeEventListener('abort', cancel);
      await reader.cancel();
      reader.releaseLock();
    }
    return Buffer.concat(chunks);
  }

  private assertSame(row: CampaignAsset, input: StoreCampaignAssetInput, hash: string): void {
    if (
      row.sha256 !== hash ||
      row.contentType !== input.source.contentType ||
      row.width !== input.source.width ||
      row.height !== input.source.height ||
      row.bucket !== this.config.bucket
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

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
function isPreconditionFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    '$metadata' in error &&
    (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 412
  );
}
function assetResult(row: CampaignAsset): StoredCampaignAsset {
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
