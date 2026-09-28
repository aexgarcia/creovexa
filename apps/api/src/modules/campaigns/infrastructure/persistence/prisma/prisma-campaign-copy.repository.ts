import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import type {
  CampaignCopyRepository,
  CopyLease,
  CopySelection,
} from '../../../application/ports/campaign-copy-repository.js';
import {
  CopyGenerationError,
  type CampaignCopy,
} from '../../../application/ports/copy-generator.js';
import { StaleGenerationResultError } from '../../../domain/errors/campaign.errors.js';
export class PrismaCampaignCopyRepository implements CampaignCopyRepository {
  constructor(private readonly client: PrismaClient) {}
  async find(selection: CopySelection): Promise<CampaignCopy | null> {
    const row = await this.client.campaignCopy.findFirst({
      where: {
        organizationId: selection.organizationId,
        campaignId: selection.campaignId,
        generationId: selection.generationId,
        status: 'READY',
      },
    });
    return row?.content ? (row.content as unknown as CampaignCopy) : null;
  }
  async claim(lease: CopyLease) {
    return this.client.$transaction(async (tx) => {
      // A no-op update locks the owner row using Prisma's configured schema.
      const locked = await tx.campaign.updateMany({
        where: {
          id: lease.campaignId,
          organizationId: lease.organizationId,
          currentGenerationId: lease.generationId,
          status: 'GENERATING',
        },
        data: { version: { increment: 0 } },
      });
      if (locked.count !== 1) throw new StaleGenerationResultError();
      const existing = await tx.campaignCopy.findUnique({
        where: { generationId: lease.generationId },
      });
      if (
        existing &&
        (existing.status === 'READY' ||
          (existing.status === 'RUNNING' && existing.expiresAt > lease.now))
      )
        return false;
      const data = {
        organizationId: lease.organizationId,
        campaignId: lease.campaignId,
        generationId: lease.generationId,
        token: lease.token,
        status: 'RUNNING' as const,
        expiresAt: lease.expiresAt,
      };
      if (existing)
        await tx.campaignCopy.update({ where: { generationId: lease.generationId }, data });
      else await tx.campaignCopy.create({ data });
      return true;
    });
  }
  async complete(lease: CopyLease, content: CampaignCopy) {
    await this.client.$transaction(async (tx) => {
      // A no-op update locks the owner row using Prisma's configured schema.
      const locked = await tx.campaign.updateMany({
        where: {
          id: lease.campaignId,
          organizationId: lease.organizationId,
          currentGenerationId: lease.generationId,
          status: 'GENERATING',
        },
        data: { version: { increment: 0 } },
      });
      if (locked.count !== 1) throw new StaleGenerationResultError();
      const result = await tx.campaignCopy.updateMany({
        where: {
          generationId: lease.generationId,
          organizationId: lease.organizationId,
          campaignId: lease.campaignId,
          token: lease.token,
          status: 'RUNNING',
        },
        data: { status: 'READY', content: { ...content } },
      });
      if (result.count !== 1) throw new CopyGenerationError('BUSY');
    });
  }
  async release(lease: CopyLease) {
    await this.client.campaignCopy.updateMany({
      where: {
        generationId: lease.generationId,
        organizationId: lease.organizationId,
        campaignId: lease.campaignId,
        token: lease.token,
        status: 'RUNNING',
      },
      data: { status: 'FAILED' },
    });
  }
}
