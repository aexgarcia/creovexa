import type { Clock } from '#app/application/ports/clock';
import { entityId, type EntityId } from '#app/domain/entity-id';
import { Organization } from '#app/modules/organizations/domain/entities/organization';
import type { OrganizationRepository } from '#app/modules/organizations/domain/repositories/organization.repository';
import type { Product } from '#app/modules/products/domain/entities/product';
import type { ProductRepository } from '#app/modules/products/domain/repositories/product.repository';
import type { OrganizationLookup } from '#app/modules/products/application/ports/organization-lookup';

export const ORGANIZATION_ID = entityId('11111111-1111-4111-8111-111111111111');
export const OTHER_ORGANIZATION_ID = entityId('22222222-2222-4222-8222-222222222222');
export const PRODUCT_ID = entityId('33333333-3333-4333-8333-333333333333');
export const ASSET_ID = entityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
export const CREATED_AT = '2026-09-17T12:00:00.000Z';
export const UPDATED_AT = '2026-09-17T13:00:00.000Z';
export const creationClock: Clock = { now: () => new Date(CREATED_AT) };
export const updateClock: Clock = { now: () => new Date(UPDATED_AT) };

export class OrganizationRepositoryFake implements OrganizationRepository {
  readonly records = new Map<EntityId, Organization>();
  saveCount = 0;

  findById(id: EntityId): Promise<Organization | null> {
    return Promise.resolve(this.records.get(id) ?? null);
  }

  add(organization: Organization): Promise<void> {
    if (this.records.has(organization.id)) throw new TypeError('Duplicate test identifier.');
    this.records.set(organization.id, organization);
    return Promise.resolve();
  }

  save(organization: Organization): Promise<void> {
    if (!this.records.has(organization.id)) throw new TypeError('Missing test record.');
    this.records.set(organization.id, organization);
    this.saveCount++;
    return Promise.resolve();
  }
}

export class OrganizationLookupFake implements OrganizationLookup {
  constructor(private readonly ids: readonly EntityId[] = [ORGANIZATION_ID]) {}

  exists(id: EntityId): Promise<boolean> {
    return Promise.resolve(this.ids.includes(id));
  }
}

export class ProductRepositoryFake implements ProductRepository {
  readonly records = new Map<EntityId, Product>();
  saveCount = 0;

  findById(organizationId: EntityId, productId: EntityId): Promise<Product | null> {
    const product = this.records.get(productId);
    return Promise.resolve(product?.organizationId === organizationId ? product : null);
  }

  add(organizationId: EntityId, product: Product): Promise<void> {
    if (product.organizationId !== organizationId || this.records.has(product.id)) {
      throw new TypeError('Invalid test insert.');
    }
    this.records.set(product.id, product);
    return Promise.resolve();
  }

  save(organizationId: EntityId, product: Product): Promise<void> {
    if (
      product.organizationId !== organizationId ||
      this.records.get(product.id)?.organizationId !== organizationId
    ) {
      throw new TypeError('Invalid test update.');
    }
    this.records.set(product.id, product);
    this.saveCount++;
    return Promise.resolve();
  }
}
