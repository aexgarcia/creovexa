import { readStorageConfig, readOptionalStorageConfig } from '#app/config/storage.config';

describe('storage configuration', () => {
  it('leaves storage optional until credentials are configured and validates partial configuration', () => {
    expect(readOptionalStorageConfig({ STORAGE_ENDPOINT: 'http://127.0.0.1:9000' })).toBeNull();
    expect(() => readOptionalStorageConfig({ STORAGE_ACCESS_KEY: 'partial' })).toThrow();
  });
  const environment = {
    STORAGE_ENDPOINT: 'http://127.0.0.1:9000',
    STORAGE_BUCKET: 'campaign-assets',
    STORAGE_ACCESS_KEY: 'test-access',
    STORAGE_SECRET_KEY: 'test-secret',
  };
  it('supports a local S3-compatible endpoint', () => {
    expect(readStorageConfig(environment)).toMatchObject({
      endpoint: environment.STORAGE_ENDPOINT,
      region: 'us-east-1',
      bucket: 'campaign-assets',
    });
  });
  it.each([
    { STORAGE_ENDPOINT: 'file:///tmp' },
    { STORAGE_ENDPOINT: 'http://user:password@localhost:9000' },
    { STORAGE_ENDPOINT: 'http://localhost:9000/bucket' },
    { STORAGE_BUCKET: '../outside' },
    { STORAGE_SECRET_KEY: '' },
    { STORAGE_ACCESS_KEY: '' },
  ])('rejects invalid configuration without disclosing credentials', (invalid) => {
    expect(() => readStorageConfig({ ...environment, ...invalid })).toThrow(
      'Configuración de almacenamiento inválida',
    );
    try {
      readStorageConfig({ ...environment, ...invalid });
    } catch (error) {
      expect(String(error)).not.toContain('test-secret');
      expect(String(error)).not.toContain('test-access');
    }
  });
});
