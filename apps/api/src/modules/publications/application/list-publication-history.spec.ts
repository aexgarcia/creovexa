import { ListPublicationHistory, ListPublicationAttempts } from './list-publication-history.js';
import {
  PublicationNotFoundError,
  type PublicationHistoryReader,
} from './publication-history-reader.js';
import { InvalidPaginationError } from '#app/domain/pagination';
const organizationId = '11111111-1111-4111-8111-111111111111',
  publicationId = '22222222-2222-4222-8222-222222222222';
describe('Publication history queries', () => {
  it('validates pagination before querying the scoped reader', async () => {
    const list = vi
      .fn<PublicationHistoryReader['list']>()
      .mockResolvedValue({ items: [], total: 0 });
    const attempts = vi.fn<PublicationHistoryReader['attempts']>();
    const query = new ListPublicationHistory({ list, attempts });
    expect(await query.execute({ organizationId, page: 2, limit: 10 })).toEqual({
      items: [],
      total: 0,
      page: 2,
      limit: 10,
    });
    expect(list).toHaveBeenCalledWith(organizationId, { page: 2, limit: 10 });
    await expect(query.execute({ organizationId, page: 0 })).rejects.toThrow(
      InvalidPaginationError,
    );
    expect(list).toHaveBeenCalledTimes(1);
  });
  it('distinguishes a missing or foreign publication from an empty history', async () => {
    const list = vi.fn<PublicationHistoryReader['list']>();
    const attempts = vi
      .fn<PublicationHistoryReader['attempts']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ items: [], total: 0 });
    const query = new ListPublicationAttempts({ list, attempts });
    await expect(query.execute({ organizationId, publicationId })).rejects.toThrow(
      PublicationNotFoundError,
    );
    expect(await query.execute({ organizationId, publicationId })).toMatchObject({
      items: [],
      total: 0,
    });
    expect(attempts).toHaveBeenCalledWith(organizationId, publicationId, { page: 1, limit: 20 });
  });
});
