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
import type {
  CampaignRepository,
  CampaignVersion,
} from '../../../domain/repositories/campaign.repository.js';
import { CampaignStatus } from '../../../domain/campaign-status.js';
import {
  ConcurrentCampaignModificationError,
  InvalidCampaignError,
} from '../../../domain/errors/campaign.errors.js';
import { CampaignMapper, campaignRelations, snapshotJson, versionOf } from './campaign.mapper.js';
import { readGenerationSnapshot, readPromotion } from './campaign-json.mapper.js';

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
    // Repeatable read mantiene la raíz y las relaciones en una misma instantánea consistente.
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

  async saveDraft(
    organizationId: EntityId,
    campaign: Campaign,
    expectedVersion: number,
  ): Promise<void> {
    if (campaign.organizationId !== organizationId) throw new PersistenceScopeError();
    if (
      campaign.status !== CampaignStatus.DRAFT ||
      !Number.isSafeInteger(expectedVersion) ||
      campaign.version !== expectedVersion + 1
    )
      throw new InvalidCampaignError('version');
    const data = CampaignMapper.toPersistence(campaign);
    try {
      const result = await this.database.campaign.updateMany({
        where: {
          organizationId,
          id: campaign.id,
          status: CampaignStatus.DRAFT,
          version: BigInt(expectedVersion),
          createdAt: campaign.createdAt,
        },
        data: {
          title: data.title,
          productId: data.productId,
          templateId: data.templateId,
          templateRevisionId: data.templateRevisionId,
          objective: data.objective,
          occasion: data.occasion,
          instructions: data.instructions,
          cta: data.cta,
          promotion: data.promotion,
          version: data.version,
          updatedAt: data.updatedAt,
        },
      });
      if (result.count !== 1) throw new ConcurrentCampaignModificationError();
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
          'objective',
          'occasion',
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
        // La vigente puede ser la misma, una nueva o una anterior que se recupera (ADR-0026).
        const storedGeneration = await tx.campaignGeneration.findUnique({
          where: { id: generation.id },
        });
        if (storedGeneration) {
          // El snapshot se compara ya leído: los guardados antes de que tuviera más datos se leen
          // con valores vacíos y no coinciden byte a byte con su forma actual.
          if (
            !isDeepStrictEqual(
              { ...storedGeneration, snapshot: null },
              { ...generationRow, snapshot: null },
            ) ||
            !readGenerationSnapshot(storedGeneration!.snapshot).equals(generation.snapshot)
          )
            throw new PersistenceConflictError();
        } else {
          const latest = await tx.campaignGeneration.aggregate({
            where: { organizationId, campaignId: campaign.id },
            _max: { number: true },
          });
          if (BigInt(generation.number) !== (latest._max.number ?? 0n) + 1n)
            throw new PersistenceConflictError();
          await tx.campaignGeneration.create({
            data: { ...generationRow, snapshot: snapshotJson(generation.snapshot) },
          });
        }
        if (campaign.candidateContent) {
          const content = CampaignMapper.content(campaign.candidateContent);
          const storedContent = await tx.generatedContent.findUnique({
            where: { id: content.id },
          });
          // El contenido de una versión recuperada ya existe y no cambia.
          if (storedContent) {
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

  async listVersions(organizationId: EntityId, campaignId: EntityId): Promise<CampaignVersion[]> {
    const rows = await this.database.campaignGeneration.findMany({
      where: { organizationId, campaignId },
      include: { content: true, failure: true },
      orderBy: { number: 'desc' },
    });
    return rows.map(versionOf);
  }
}
