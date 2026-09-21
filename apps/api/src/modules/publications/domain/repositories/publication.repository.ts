import type { EntityId } from '#app/domain/entity-id';
import type { Publication } from '../entities/publication.js';

export interface PublicationRepository {
  findById(organizationId: EntityId, publicationId: EntityId): Promise<Publication | null>;
  listByCampaign(organizationId: EntityId, campaignId: EntityId): Promise<Publication[]>;
  /** Insert a new pending destination. Commit together with the campaign summary. */
  add(organizationId: EntityId, publication: Publication): Promise<void>;
  /** Advance exactly one version; retain immutable attempts/results. Never upsert. */
  save(organizationId: EntityId, publication: Publication, expectedVersion: number): Promise<void>;
}
