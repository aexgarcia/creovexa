import { entityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { Prisma } from '#app/infrastructure/persistence/prisma/generated/client';
import type {
  CampaignGeneration,
  GeneratedContent as ContentRow,
} from '#app/infrastructure/persistence/prisma/generated/client';
import { Campaign, type GenerationOperation } from '../../../domain/entities/campaign.js';
import type { CampaignVersion } from '../../../domain/repositories/campaign.repository.js';
import { GeneratedContent } from '../../../domain/entities/generated-content.js';
import { CampaignObjective } from '../../../domain/campaign-objective.js';
import {
  CampaignStatus,
  CampaignFailureOrigin,
  GenerationFailureCode,
} from '../../../domain/campaign-status.js';
import { InvalidCampaignError } from '../../../domain/errors/campaign.errors.js';
import {
  readGenerationSnapshot,
  readPromotion,
  readPublicationProgress,
} from './campaign-json.mapper.js';

export const campaignRelations = {
  currentGeneration: { include: { failure: true } },
  candidateContent: true,
  // Solo la de número más alto: la vigente puede ser una anterior recuperada (ADR-0026).
  generations: { select: { number: true }, orderBy: { number: 'desc' }, take: 1 },
} satisfies Prisma.CampaignInclude;
export type CampaignRecord = Prisma.CampaignGetPayload<{ include: typeof campaignRelations }>;

// El snapshot como JSON plano: sin readonly ni prototipos, tal como se guarda.
export function snapshotJson(snapshot: GenerationOperation['snapshot']): Prisma.JsonObject {
  return JSON.parse(JSON.stringify(snapshot.data)) as Prisma.JsonObject;
}

export class CampaignMapper {
  static toDomain(row: CampaignRecord): Campaign {
    const source = row.currentGeneration;
    if (
      (source?.id ?? null) !== row.currentGenerationId ||
      (row.candidateContent?.id ?? null) !== row.candidateContentId ||
      (source && (source.organizationId !== row.organizationId || source.campaignId !== row.id)) ||
      (source?.failure?.code ?? null) !== row.generationFailure
    )
      throw new InvalidCampaignError('storedReferences');
    const generation =
      source === null
        ? null
        : {
            id: entityId(source.id),
            number: Number(source.number),
            snapshot: readGenerationSnapshot(source.snapshot),
            requestedAt: source.requestedAt.getTime(),
          };
    if (source?.failure) {
      timestamp(source.failure.recordedAt, source.requestedAt.getTime());
      timestamp(row.updatedAt, source.failure.recordedAt.getTime());
    }
    const content = row.candidateContent;
    if (content !== null && generation === null) throw new InvalidCampaignError('generation');
    return Campaign.restore({
      id: entityId(row.id),
      organizationId: entityId(row.organizationId),
      productId: entityId(row.productId),
      templateId: entityId(row.templateId),
      templateRevisionId: entityId(row.templateRevisionId),
      objective: CampaignObjective[row.objective],
      occasion: row.occasion,
      title: row.title,
      instructions: row.instructions,
      cta: row.cta,
      promotion: readPromotion(row.promotion),
      status: CampaignStatus[row.status],
      generation,
      lastGenerationNumber: Number(row.generations[0]?.number ?? 0),
      candidateContent:
        content === null
          ? null
          : GeneratedContent.create(
              {
                id: content.id,
                organizationId: content.organizationId,
                campaignId: content.campaignId,
                generationId: content.generationId,
                revision: generation!.number,
              },
              generation!.snapshot,
              content,
              content.createdAt,
            ),
      approvedContentId: row.approvedContentId === null ? null : entityId(row.approvedContentId),
      approvedSocialAccountIds: row.approvedSocialAccountIds.map((id) => entityId(id)),
      publicationProgress: readPublicationProgress(
        row.publicationProgress,
        row.organizationId,
        row.id,
        row.approvedContentId,
        row.approvedSocialAccountIds,
      ),
      failureOrigin: row.failureOrigin === null ? null : CampaignFailureOrigin[row.failureOrigin],
      generationFailure:
        row.generationFailure === null ? null : GenerationFailureCode[row.generationFailure],
      version: Number(row.version),
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    });
  }

  static toPersistence(campaign: Campaign): Prisma.CampaignUncheckedCreateInput {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      productId: campaign.productId,
      templateId: campaign.templateId,
      templateRevisionId: campaign.templateRevisionId,
      objective: campaign.objective,
      occasion: campaign.occasion,
      title: campaign.title,
      instructions: campaign.instructions,
      cta: campaign.cta,
      promotion: campaign.promotion?.toSnapshot() ?? Prisma.DbNull,
      status: campaign.status,
      currentGenerationId: campaign.generation?.id ?? null,
      candidateContentId: campaign.candidateContent?.id ?? null,
      approvedContentId: campaign.approvedContentId,
      approvedSocialAccountIds: [...campaign.approvedSocialAccountIds],
      publicationProgress:
        campaign.publicationProgress?.entries.map((entry) => ({ ...entry })) ?? Prisma.DbNull,
      failureOrigin: campaign.failureOrigin,
      generationFailure: campaign.generationFailure,
      version: BigInt(campaign.version),
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }

  static generation(campaign: Campaign, generation: GenerationOperation): CampaignGeneration {
    return {
      id: generation.id,
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      number: BigInt(generation.number),
      snapshot: snapshotJson(generation.snapshot),
      requestedAt: new Date(generation.requestedAt),
    };
  }

  static content(content: GeneratedContent): ContentRow {
    return {
      id: content.id,
      organizationId: content.organizationId,
      campaignId: content.campaignId,
      generationId: content.generationId,
      headline: content.headline,
      subheadline: content.subheadline,
      caption: content.caption,
      cta: content.cta,
      hashtags: [...content.hashtags],
      assetIds: [...content.assetIds],
      createdAt: content.createdAt,
    };
  }
}

type VersionRecord = Prisma.CampaignGenerationGetPayload<{
  include: { content: true; failure: true };
}>;

// Una generación guardada con su contenido o su fallo, como versión del historial (ADR-0026).
export function versionOf(row: VersionRecord): CampaignVersion {
  const generation: GenerationOperation = Object.freeze({
    id: entityId(row.id),
    number: Number(row.number),
    snapshot: readGenerationSnapshot(row.snapshot),
    requestedAt: row.requestedAt.getTime(),
  });
  const content = row.content;
  return {
    generation,
    content:
      content === null
        ? null
        : GeneratedContent.create(
            {
              id: content.id,
              organizationId: content.organizationId,
              campaignId: content.campaignId,
              generationId: content.generationId,
              revision: generation.number,
            },
            generation.snapshot,
            content,
            content.createdAt,
          ),
    failure: row.failure === null ? null : GenerationFailureCode[row.failure.code],
  };
}
