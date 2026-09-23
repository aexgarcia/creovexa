import { readCatalogHttpConfig } from './catalog-http.config.js';
const id = 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA';
describe('Development catalog context', () => {
  it('keeps the catalog disabled by default, including production', () => {
    expect(readCatalogHttpConfig({})).toEqual({ organizationId: null });
    expect(readCatalogHttpConfig({ NODE_ENV: 'production' })).toEqual({ organizationId: null });
  });
  it('normalizes the configured UUID', () => {
    expect(readCatalogHttpConfig({ DEV_ORGANIZATION_ID: id }).organizationId).toBe(
      id.toLowerCase(),
    );
  });
  it.each(['production', 'staging'])('rejects the development context in %s', (NODE_ENV) => {
    expect(() => readCatalogHttpConfig({ NODE_ENV, DEV_ORGANIZATION_ID: id })).toThrow(
      'desarrollo',
    );
  });
  it('rejects invalid IDs without echoing configuration', () => {
    expect(() => readCatalogHttpConfig({ DEV_ORGANIZATION_ID: 'private-setting' })).toThrow(
      'Configuración inválida: DEV_ORGANIZATION_ID debe ser un UUID válido.',
    );
  });
});
