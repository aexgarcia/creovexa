import type { PrismaClient, Prisma } from '#app/infrastructure/persistence/prisma/generated/client';
import type {
  CampaignImageRepository,
  CampaignImageLease,
  CampaignImageCompletion,
} from '../../../application/ports/campaign-image-repository.js';
import type { CampaignCopy } from '../../../application/ports/copy-generator.js';
import type { CampaignImageSelection } from '../../../application/ports/image-artifact.js';
import type { StoredCampaignAsset } from '../../../application/ports/storage-provider.js';
import { CampaignImageError } from '#app/modules/campaigns/application/errors/campaign-image.error';
import { PrismaCampaignRepository } from '#app/modules/campaigns/infrastructure/persistence/prisma/prisma-campaign.repository';

export async function databaseTime(tx: Prisma.TransactionClient): Promise<Date> {
  const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return row.now;
}

// Serialize claims, asset registration and completion on the same campaign row.
export async function lockImageCampaign(
  tx: Prisma.TransactionClient,
  selection: CampaignImageSelection,
  expectedVersion?: number,
): Promise<void> {
  const result = await tx.campaign.updateMany({
    where: {
      id: selection.campaignId,
      organizationId: selection.organizationId,
      currentGenerationId: selection.generationId,
      status: 'GENERATING',
      ...(expectedVersion === undefined ? {} : { version: expectedVersion }),
    },
    data: { version: { increment: 0 } },
  });
  if (result.count !== 1) throw new CampaignImageError('STALE_RESULT');
}

export async function requireImageLease(
  tx: Prisma.TransactionClient,
  selection: CampaignImageSelection,
  token: string,
): Promise<void> {
  const job = await tx.campaignImageJob.findFirst({
    where: { ...selection, token, status: 'RUNNING' },
  });
  if (!job || job.expiresAt <= (await databaseTime(tx)))
    throw new CampaignImageError('STALE_RESULT');
}

export class PrismaCampaignImageRepository implements CampaignImageRepository {
  constructor(private readonly client: PrismaClient) {}

  async claim(lease: CampaignImageLease): Promise<boolean> {
    if (!Number.isSafeInteger(lease.expectedVersion) || lease.expectedVersion < 0)
      throw new CampaignImageError('STALE_RESULT');
    return this.client.$transaction(async (tx) => {
      await lockImageCampaign(tx, lease, lease.expectedVersion);
      const now = await databaseTime(tx);
      if (!Number.isFinite(lease.expiresAt.getTime()) || lease.expiresAt <= now)
        throw new CampaignImageError('TIMEOUT');
      const copy = await tx.campaignCopy.findFirst({
        where: { ...selectionOf(lease), status: 'READY' },
      });
      if (!copy?.content) throw new CampaignImageError('COPY_REQUIRED');
      const existing = await tx.campaignImageJob.findUnique({
        where: { generationId: lease.generationId },
      });
      if (
        existing &&
        (existing.status === 'READY' ||
          existing.token === lease.token ||
          (existing.status === 'RUNNING' && existing.expiresAt > now))
      )
        return false;
      const data = {
        ...selectionOf(lease),
        token: lease.token,
        expectedVersion: lease.expectedVersion,
        expiresAt: lease.expiresAt,
        status: 'RUNNING' as const,
      };
      await tx.campaignImageJob.upsert({
        where: { generationId: lease.generationId },
        create: data,
        update: data,
      });
      return true;
    });
  }

  async complete(
    lease: CampaignImageLease,
    result: CampaignImageCompletion,
    at: Date,
  ): Promise<void> {
    await this.client.$transaction(async (tx) => {
      await lockImageCampaign(tx, lease, lease.expectedVersion);
      const selection = selectionOf(lease);
      await requireImageLease(tx, selection, lease.token);
      const { campaign, baseAsset, finalAsset } = result;
      const content = campaign.candidateContent;
      if (
        campaign.id !== lease.campaignId ||
        campaign.organizationId !== lease.organizationId ||
        campaign.generation?.id !== lease.generationId ||
        campaign.status !== 'PENDING_APPROVAL' ||
        campaign.version !== lease.expectedVersion + 1 ||
        !content ||
        content.assetIds.length !== 1 ||
        content.assetIds[0] !== finalAsset.id ||
        baseAsset.id === finalAsset.id ||
        baseAsset.purpose !== 'BASE_IMAGE' ||
        finalAsset.purpose !== 'FINAL_PIECE' ||
        finalAsset.contentType !== 'image/png' ||
        finalAsset.width !== 1080 ||
        finalAsset.height !== 1080 ||
        !Number.isFinite(at.getTime()) ||
        at >= lease.expiresAt
      )
        throw new CampaignImageError('INVALID_OUTPUT');
      const copyRow = await tx.campaignCopy.findFirst({ where: { ...selection, status: 'READY' } });
      const copy = copyRow?.content as unknown as CampaignCopy | null;
      if (
        !copy ||
        copy.headline !== content.headline ||
        copy.caption !== content.caption ||
        copy.cta !== content.cta ||
        JSON.stringify(copy.hashtags) !== JSON.stringify(content.hashtags)
      )
        throw new CampaignImageError('INVALID_OUTPUT');
      for (const asset of [baseAsset, finalAsset]) await this.checkAsset(tx, lease, asset);
      await new PrismaCampaignRepository(tx).save(
        lease.organizationId,
        campaign,
        lease.expectedVersion,
      );
      // Recheck after all writes: a worker that waited for locks cannot commit an expired lease.
      await requireImageLease(tx, selection, lease.token);
      const completed = await tx.campaignImageJob.updateMany({
        where: {
          ...selection,
          token: lease.token,
          status: 'RUNNING',
          expectedVersion: lease.expectedVersion,
        },
        data: { status: 'READY' },
      });
      if (completed.count !== 1) throw new CampaignImageError('STALE_RESULT');
    });
  }

  async release(lease: CampaignImageLease): Promise<void> {
    await this.client.campaignImageJob.updateMany({
      where: { ...selectionOf(lease), token: lease.token, status: 'RUNNING' },
      data: { status: 'FAILED' },
    });
  }

  private async checkAsset(
    tx: Prisma.TransactionClient,
    lease: CampaignImageLease,
    asset: StoredCampaignAsset,
  ) {
    const row = await tx.campaignAsset.findFirst({
      where: {
        ...selectionOf(lease),
        id: asset.id,
        operationId: lease.token,
        purpose: asset.purpose,
      },
    });
    if (
      !row ||
      asset.organizationId !== row.organizationId ||
      asset.campaignId !== row.campaignId ||
      asset.generationId !== row.generationId ||
      asset.contentType !== row.contentType ||
      asset.width !== row.width ||
      asset.height !== row.height
    )
      throw new CampaignImageError('INVALID_OUTPUT');
  }
}

function selectionOf(value: CampaignImageSelection): CampaignImageSelection {
  return {
    organizationId: value.organizationId,
    campaignId: value.campaignId,
    generationId: value.generationId,
  };
}
