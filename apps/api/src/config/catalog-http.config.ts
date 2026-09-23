import { entityId, type EntityId } from '#app/domain/entity-id';
import { applicationEnvironment } from './environment.js';

export interface CatalogHttpConfig {
  organizationId: EntityId | null;
}
export const CATALOG_HTTP_CONFIG = Symbol('CATALOG_HTTP_CONFIG');

export function readCatalogHttpConfig(environment: NodeJS.ProcessEnv): CatalogHttpConfig {
  const value = environment.DEV_ORGANIZATION_ID;
  if (value === undefined || value === '') return { organizationId: null };
  if (!['development', 'test', undefined].includes(environment.NODE_ENV))
    throw new Error('DEV_ORGANIZATION_ID solo se permite en desarrollo o pruebas.');
  try {
    return { organizationId: entityId(value) };
  } catch {
    throw new Error('Configuración inválida: DEV_ORGANIZATION_ID debe ser un UUID válido.');
  }
}
export const catalogHttpConfigProvider = {
  provide: CATALOG_HTTP_CONFIG,
  useFactory: () => readCatalogHttpConfig(applicationEnvironment()),
};
