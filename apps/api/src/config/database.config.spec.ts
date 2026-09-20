import { readDatabaseConfig } from './database.config.js';

describe('Database configuration', () => {
  it('reads PostgreSQL connection and selected schema', () => {
    expect(
      readDatabaseConfig({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db?schema=tenant',
      }),
    ).toEqual({ url: 'postgresql://user:pass@localhost:5432/db?schema=tenant', schema: 'tenant' });
    expect(readDatabaseConfig({ DATABASE_URL: 'postgres://user:pass@localhost/db' }).schema).toBe(
      'public',
    );
  });

  it.each([
    undefined,
    '',
    'mysql://user:pass@localhost/db',
    'postgresql://localhost/db',
    'postgresql://user:pass@localhost/',
    'postgresql://user:pass@localhost/db?schema=bad-name',
  ])('rejects invalid configuration without exposing credentials', (DATABASE_URL) => {
    expect(() => readDatabaseConfig({ DATABASE_URL })).toThrow(
      'Configuración inválida: DATABASE_URL',
    );
    try {
      readDatabaseConfig({ DATABASE_URL });
    } catch (error) {
      expect((error as Error).message).not.toContain('pass@');
    }
  });
});
