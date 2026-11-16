import { entityId } from '#app/domain/entity-id';
import { InvalidProductError } from '../../domain/errors/product.errors.js';
import type { ProductKind } from '../../domain/product-kind.js';
import { ProductOrganizationNotFoundError } from '../errors/product-organization-not-found.error.js';
import { ProductSuggestionError } from '../errors/product-suggestion.error.js';
import type { OrganizationLookup } from '../ports/organization-lookup.js';
import type { ProductSalesAdvisor } from '../ports/product-sales-advisor.js';
import { normalizeSuggestion, type SalesSuggestion } from '../sales-suggestion-policy.js';

// Los datos del formulario, guardado o no: la sugerencia no necesita un producto creado.
export interface SuggestProductSalesDataInput {
  organizationId: string;
  kind: ProductKind;
  name: string;
  description?: string;
  productBrand?: string | null;
  keyAttributes?: readonly string[];
  unit?: string | null;
}

const clean = (value: string | null | undefined) => value?.trim() || null;

// Propone beneficios y «para quién es» con IA, sin guardar nada (ADR-0031).
export class SuggestProductSalesData {
  constructor(
    private readonly organizations: OrganizationLookup,
    private readonly advisor: ProductSalesAdvisor,
  ) {}

  available(): boolean {
    return this.advisor.available();
  }

  async execute(input: SuggestProductSalesDataInput): Promise<SalesSuggestion> {
    if (!this.advisor.available()) throw new ProductSuggestionError('UNAVAILABLE');
    const name = clean(input.name);
    if (!name) throw new InvalidProductError('name');
    const context = await this.organizations.salesContext(
      entityId(input.organizationId, 'organizationId'),
    );
    if (!context) throw new ProductOrganizationNotFoundError();
    const raw = await this.advisor.suggest({
      region: context.region,
      business: {
        name: context.name,
        description: clean(context.description),
        industry: context.industry,
        brandTone: context.brandTone,
        audience: context.audience,
      },
      product: {
        kind: input.kind,
        name,
        productBrand: clean(input.productBrand),
        description: clean(input.description),
        keyAttributes: (input.keyAttributes ?? []).map((item) => item.trim()).filter(Boolean),
        unit: clean(input.unit),
      },
    });
    return normalizeSuggestion(raw);
  }
}
