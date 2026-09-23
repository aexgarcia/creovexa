export interface Pagination {
  page: number;
  limit: number;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export class InvalidPaginationError extends Error {
  constructor() {
    super('La página debe estar entre 1 y 10000 y el límite entre 1 y 100.');
    this.name = 'InvalidPaginationError';
  }
}

export function pagination(input: Partial<Pagination>): Pagination {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new InvalidPaginationError();
  return { page, limit };
}
