import type { EntityId } from '#app/domain/entity-id';
import type { Pagination, Page } from '#app/domain/pagination';
import type { Publication } from '#app/modules/publications/domain/entities/publication';
import type { PublicationRepository } from '#app/modules/publications/domain/repositories/publication.repository';

export class PublicationQueryFake implements PublicationRepository {
  readonly records = new Map<EntityId, Publication>();
  findById(organizationId: EntityId, id: EntityId): Promise<Publication | null> {
    const record = this.records.get(id);
    return Promise.resolve(record?.organizationId === organizationId ? record : null);
  }
  listByCampaign(organizationId: EntityId, campaignId: EntityId): Promise<Publication[]> {
    return Promise.resolve(
      [...this.records.values()]
        .filter((p) => p.organizationId === organizationId && p.campaignId === campaignId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)),
    );
  }
  async pageByCampaign(
    organizationId: EntityId,
    campaignId: EntityId,
    { page, limit }: Pagination,
  ): Promise<Page<Publication>> {
    const records = await this.listByCampaign(organizationId, campaignId);
    return { total: records.length, items: records.slice((page - 1) * limit, page * limit) };
  }
  add(organizationId: EntityId, publication: Publication): Promise<void> {
    if (publication.organizationId !== organizationId || this.records.has(publication.id))
      throw new Error('Invalid test insert');
    this.records.set(publication.id, publication);
    return Promise.resolve();
  }
  save(): Promise<void> {
    throw new Error('Read-only test repository');
  }
}
