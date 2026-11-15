import { randomUUID } from 'node:crypto';
import type { TransactionContext } from '#app/application/ports/transaction-context';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { prismaTransaction } from '#app/infrastructure/persistence/prisma/transaction-context';
import type { GenerationJobState } from '../../../application/generation-job.js';
import type {
  CampaignCopyRepository,
  CopyLease,
  CopySelection,
} from '../../../application/ports/campaign-copy-repository.js';
import {
  CopyGenerationError,
  type CampaignCopy,
} from '../../../application/ports/copy-generator.js';
import { transactionContext } from '#app/infrastructure/persistence/prisma/transaction-context';
import {
  StaleGenerationResultError,
  type CampaignGenerations,
} from '#app/modules/campaigns/contract';
export class PrismaCampaignCopyRepository implements CampaignCopyRepository {
  constructor(
    private readonly client: PrismaClient,
    private readonly generations: CampaignGenerations,
  ) {}
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
      // Campaigns bloquea su propia fila y confirma que esta generación sigue siendo la actual.
      if (!(await this.generations.lock(selectionOf(lease), transactionContext(tx))))
        throw new StaleGenerationResultError();
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
        failureCode: null,
      };
      if (existing)
        await tx.campaignCopy.update({ where: { generationId: lease.generationId }, data });
      else await tx.campaignCopy.create({ data });
      return true;
    });
  }
  async complete(lease: CopyLease, content: CampaignCopy) {
    await this.client.$transaction(async (tx) => {
      // Campaigns bloquea su propia fila y confirma que esta generación sigue siendo la actual.
      if (!(await this.generations.lock(selectionOf(lease), transactionContext(tx))))
        throw new StaleGenerationResultError();
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
  async state(selection: CopySelection, now: Date): Promise<GenerationJobState | null> {
    const row = await this.client.campaignCopy.findFirst({ where: selectionOf(selection) });
    if (!row) return null;
    if (row.status === 'RUNNING' && row.expiresAt <= now)
      return { status: 'FAILED', failureCode: 'TIMEOUT' };
    if (row.status === 'FAILED')
      return { status: 'FAILED', failureCode: row.failureCode ?? 'FAILED' };
    return { status: row.status };
  }
  async queue(selection: CopySelection, at: Date, transaction: TransactionContext) {
    const tx = prismaTransaction(transaction);
    const existing = await tx.campaignCopy.findUnique({
      where: { generationId: selection.generationId },
    });
    // El copy terminado y el trabajo en curso quedan como están.
    if (
      existing &&
      (existing.status === 'READY' || (existing.status === 'RUNNING' && existing.expiresAt > at))
    )
      return;
    const data = {
      ...selectionOf(selection),
      token: randomUUID(),
      status: 'QUEUED' as const,
      expiresAt: at,
      failureCode: null,
    };
    await tx.campaignCopy.upsert({
      where: { generationId: selection.generationId },
      create: data,
      update: data,
    });
  }
  async fail(selection: CopySelection, failureCode: string, at: Date) {
    const data = {
      ...selectionOf(selection),
      token: randomUUID(),
      status: 'FAILED' as const,
      expiresAt: at,
      failureCode,
    };
    await this.client.$transaction(async (tx) => {
      const existing = await tx.campaignCopy.findUnique({
        where: { generationId: selection.generationId },
      });
      if (existing?.status === 'READY') return;
      await tx.campaignCopy.upsert({
        where: { generationId: selection.generationId },
        create: data,
        update: data,
      });
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

function selectionOf(value: CopySelection): CopySelection {
  return {
    organizationId: value.organizationId,
    campaignId: value.campaignId,
    generationId: value.generationId,
  };
}
