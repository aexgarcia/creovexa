import { entityId, InvalidEntityIdError } from './entity-id.js';

describe('Entity identifiers', () => {
  it('normalizes UUID casing for consistent identity comparisons', () => {
    expect(entityId('AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA')).toBe(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });

  it.each([
    '',
    'product-1',
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-1111-111111111111',
  ])('rejects malformed identifier %j', (value) => {
    expect(() => entityId(value)).toThrow(InvalidEntityIdError);
  });
});
