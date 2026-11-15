import type { EntityId } from '#app/domain/entity-id';
import type { Pagination, Page } from '#app/domain/pagination';
import type { GenerationFailureCode } from '../campaign-status.js';
import type { Campaign, GenerationOperation } from '../entities/campaign.js';
import type { GeneratedContent } from '../entities/generated-content.js';

// Una generación de la campaña con su resultado: el contenido, el fallo o ninguno si sigue en curso.
export interface CampaignVersion {
  generation: GenerationOperation;
  content: GeneratedContent | null;
  failure: GenerationFailureCode | null;
}

export interface CampaignRepository {
  list(organizationId: EntityId, pagination: Pagination): Promise<Page<Campaign>>;
  findById(organizationId: EntityId, campaignId: EntityId): Promise<Campaign | null>;
  add(organizationId: EntityId, campaign: Campaign): Promise<void>;
  save(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void>;
  // Guarda el brief editado de un borrador, si sigue en DRAFT y en la versión esperada.
  saveDraft(organizationId: EntityId, campaign: Campaign, expectedVersion: number): Promise<void>;
  // Todas las generaciones de la campaña, de la más nueva a la más antigua (ADR-0026).
  listVersions(organizationId: EntityId, campaignId: EntityId): Promise<CampaignVersion[]>;
}
