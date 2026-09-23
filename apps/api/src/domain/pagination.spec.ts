import { pagination, InvalidPaginationError } from './pagination.js';
describe('Pagination boundaries', () => {
  it('provides defaults', () => expect(pagination({})).toEqual({ page: 1, limit: 20 }));
  it.each([
    { page: 0 },
    { page: 10001 },
    { page: 1.5 },
    { limit: 0 },
    { limit: 101 },
    { limit: Infinity },
  ])('rejects invalid bounds %j', (input) =>
    expect(() => pagination(input)).toThrow(InvalidPaginationError),
  );
});
