import { entityId } from '#app/domain/entity-id';
import { pagination, type Pagination } from '#app/domain/pagination';
import {
  PublicationNotFoundError,
  type PublicationHistoryReader,
} from './publication-history-reader.js';
export class ListPublicationHistory {
  constructor(private readonly reader: PublicationHistoryReader) {}
  async execute(input: { organizationId: string } & Partial<Pagination>) {
    const window = pagination(input);
    return { ...window, ...(await this.reader.list(entityId(input.organizationId), window)) };
  }
}
export class ListPublicationAttempts {
  constructor(private readonly reader: PublicationHistoryReader) {}
  async execute(input: { organizationId: string; publicationId: string } & Partial<Pagination>) {
    const window = pagination(input);
    const result = await this.reader.attempts(
      entityId(input.organizationId),
      entityId(input.publicationId),
      window,
    );
    if (!result) throw new PublicationNotFoundError();
    return { ...window, ...result };
  }
}
