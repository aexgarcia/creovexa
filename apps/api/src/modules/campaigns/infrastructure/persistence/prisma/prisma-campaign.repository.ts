import { isDeepStrictEqual } from 'node:util';
import type { EntityId } from '#app/domain/entity-id';
import { pagination, type Pagination, type Page } from '#app/domain/pagination';
import {
  inPrismaTransaction,
  type PrismaSession,
} from '#app/infrastructure/persistence/prisma/prisma-session';
import {
  PersistenceConflictError,
  PersistenceScopeError,
} from '#app/infrastructure/persistence/persistence.errors';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import type { Campaign } from '../../../domain/entities/campaign.js';
import type { CampaignRepository } from '../../../domain/repositories/campaign.repository.js';
import { CampaignStatus } from '../../../domain/campaign-status.js';
import {
  ConcurrentCampaignModificationError,
  InvalidCampaignError,
} from '../../../domain/errors/campaign.errors.js';
import { CampaignMapper, campaignRelations } from './campaign.mapper.js';
import { readPromotion } from './campaign-json.mapper.js';

export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly database: PrismaSession) {}

  async list(organizationId: EntityId, input: Pagination): Promise<Page<Campaign>> {
    const { page, limit } = pagination(input);
    return inPrismaTransaction(
      this.database,
      async (tx) => {
        const where = { organizationId };
        const rows = await tx.campaign.findMany({
          where,
          include: campaignRelations,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        const total = await tx.campaign.count({ where });
        return { items: rows.map(CampaignMapper.toDomain), total };
      },
      'RepeatableRead',
    );
  }

  async findById(organizationId: EntityId, campaignId: EntityId): Promise<Campaign | null> {
    // Repeatable read keeps the root and relation queries in one consistent snapshot.
    return inPrismaTransaction(
      this.database,
      async (tx) => {
        const row = await tx.campaign.findUnique({
          where: { organizationId_id: { organizationId, id: campaignId } },
          include: campaignRelations,
        });
        return row === null ? null : CampaignMapper.toDomain(row);
      },
      'RepeatableRead',
    );
  }

  async add(organizationId: EntityId, campaign: Campaign): Promise<void> {
    if (campaign.organizationId !== organizationId) throw new PersistenceScopeError();
    if (campaign.status !== CampaignStatus.DRAFT || campaign.version !== 0)
      throw new InvalidCampaignError('initialState');
    try {
      await this.database.campaign.create({
        data: CampaignMapper.toPersistence(campaign),
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }

  async save(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void> {
    if (campaign.organizationId !== organizationId) throw new PersistenceScopeError();
    if (
      !Number.isSafeInteger(expectedVersion) ||
      expectedVersion < 0 ||
      campaign.version !== expectedVersion + 1
    )
      throw new InvalidCampaignError('version');
    try {
      await inPrismaTransaction(this.database, async (tx) => {
        const where = { organizationId, id: campaign.id };
        const previous = await tx.campaign.findUnique({
          where: { organizationId_id: where },
        });
        if (!previous || previous.version !== BigInt(expectedVersion))
          throw new ConcurrentCampaignModificationError();
        for (const key of [
          'title',
          'productId',
          'templateId',
          'templateRevisionId',
          'instructions',
          'cta',
        ] as const) {
          if (previous[key] !== campaign[key]) throw new PersistenceConflictError();
        }
        if (
          previous.createdAt.getTime() !== campaign.createdAt.getTime() ||
          campaign.updatedAt < previous.updatedAt ||
          !isDeepStrictEqual(
            readPromotion(previous.promotion)?.toSnapshot(),
            campaign.promotion?.toSnapshot(),
          )
        )
          throw new PersistenceConflictError();
        const data = CampaignMapper.toPersistence(campaign);
        const result = await tx.campaign.updateMany({
          where: { ...where, version: BigInt(expectedVersion) },
          data: {
            status: data.status,
            currentGenerationId: data.currentGenerationId,
            candidateContentId: data.candidateContentId,
            approvedContentId: data.approvedContentId,
            approvedSocialAccountIds: data.approvedSocialAccountIds,
            publicationProgress: data.publicationProgress,
            failureOrigin: data.failureOrigin,
            generationFailure: data.generationFailure,
            version: data.version,
            updatedAt: data.updatedAt,
          },
        });
        if (result.count !== 1) throw new ConcurrentCampaignModificationError();

        const generation = campaign.generation;
        if (!generation) throw new InvalidCampaignError('generation');
        const generationRow = CampaignMapper.generation(campaign, generation);
        const storedGeneration =
          previous.currentGenerationId === null
            ? null
            : await tx.campaignGeneration.findUniqueOrThrow({
                where: { id: previous.currentGenerationId },
              });
        if (generation.id === previous.currentGenerationId) {
          if (!isDeepStrictEqual(storedGeneration, generationRow))
            throw new PersistenceConflictError();
        } else {
          if (BigInt(generation.number) !== (storedGeneration?.number ?? 0n) + 1n)
            throw new PersistenceConflictError();
          await tx.campaignGeneration.create({
            data: { ...generationRow, snapshot: generation.snapshot.data },
          });
        }
        if (campaign.candidateContent) {
          const content = CampaignMapper.content(campaign.candidateContent);
          if (previous.candidateContentId === content.id) {
            const storedContent = await tx.generatedContent.findUniqueOrThrow({
              where: { id: content.id },
            });
            if (!isDeepStrictEqual(storedContent, content)) throw new PersistenceConflictError();
          } else {
            await tx.generatedContent.create({ data: content });
          }
        }
        if (campaign.generationFailure !== null) {
          if (
            previous.currentGenerationId === generation.id &&
            previous.generationFailure !== null
          ) {
            if (previous.generationFailure !== campaign.generationFailure)
              throw new PersistenceConflictError();
          } else {
            await tx.campaignGenerationFailure.create({
              data: {
                generationId: generation.id,
                code: campaign.generationFailure,
                recordedAt: campaign.updatedAt,
              },
            });
          }
        }
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }
}
