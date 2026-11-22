import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { entityId } from '#app/domain/entity-id';
import { Money } from '#app/domain/value-objects/money';
import { Product } from '../../domain/entities/product.js';
import type { ProductKind } from '../../domain/product-kind.js';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';
import { ProductOrganizationNotFoundError } from '../errors/product-organization-not-found.error.js';
import type { OrganizationLookup } from '../ports/organization-lookup.js';
import { productResult, type ProductResult } from '../product-result.js';
import { PlanResource, type PlanLimits } from '#app/modules/plans/contract';

export interface CreateProductInput {
  organizationId: string;
  kind: ProductKind;
  name: string;
  description?: string;
  regularPrice: { amountMinor: number; currency: string };
  shortName?: string | null;
  productBrand?: string | null;
  keyAttributes?: readonly string[];
  unit?: string | null;
  benefits?: readonly string[];
  idealFor?: string | null;
  imageAssetIds?: readonly string[];
}

export class CreateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly organizations: OrganizationLookup,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly limits: PlanLimits,
  ) {}

  async execute(input: CreateProductInput): Promise<ProductResult> {
    const organizationId = entityId(input.organizationId, 'organizationId');
    if (!(await this.organizations.exists(organizationId))) {
      throw new ProductOrganizationNotFoundError();
    }
    await this.limits.assertCanCreate(organizationId, PlanResource.PRODUCT);

    const product = Product.create(
      this.ids.next(),
      organizationId,
      input.kind,
      {
        name: input.name,
        description: input.description,
        regularPrice: Money.fromMinorUnits(
          input.regularPrice.amountMinor,
          input.regularPrice.currency,
        ),
        shortName: input.shortName,
        productBrand: input.productBrand,
        keyAttributes: input.keyAttributes,
        unit: input.unit,
        benefits: input.benefits,
        idealFor: input.idealFor,
        imageAssetIds: input.imageAssetIds,
      },
      this.clock.now(),
    );
    await this.products.add(organizationId, product);
    return productResult(product);
  }
}
