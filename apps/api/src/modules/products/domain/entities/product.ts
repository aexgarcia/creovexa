import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { Money } from '#app/domain/value-objects/money';
import { InvalidProductError } from '../errors/product.errors.js';
import { ProductKind } from '../product-kind.js';

export interface ProductDetails {
  name: string;
  description?: string;
  regularPrice: Money;
  imageAssetIds?: readonly string[];
}

export type ProductDetailsChanges = Partial<ProductDetails>;

interface ProductState {
  id: EntityId;
  organizationId: EntityId;
  kind: ProductKind;
  name: string;
  description: string;
  regularPrice: Money;
  imageAssetIds: readonly EntityId[];
  createdAt: number;
  updatedAt: number;
}

function details(input: ProductDetails) {
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new InvalidProductError('name');
  }
  if (input.description !== undefined && typeof input.description !== 'string') {
    throw new InvalidProductError('description');
  }
  if (!(input.regularPrice instanceof Money)) throw new InvalidProductError('regularPrice');
  const imageAssetIds = input.imageAssetIds === undefined ? [] : input.imageAssetIds;
  if (!Array.isArray(imageAssetIds)) throw new InvalidProductError('imageAssetIds');
  const normalizedIds = imageAssetIds.map((id: string) => entityId(id, 'imageAssetIds'));
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new InvalidProductError('imageAssetIds');
  }
  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    regularPrice: input.regularPrice,
    imageAssetIds: Object.freeze(normalizedIds),
  };
}

export class Product {
  readonly #state: Readonly<ProductState>;

  private constructor(state: ProductState) {
    this.#state = Object.freeze(state);
  }

  static create(
    id: string,
    organizationId: string,
    kind: ProductKind,
    input: ProductDetails,
    at: Date,
  ): Product {
    if (!Object.values(ProductKind).includes(kind)) throw new InvalidProductError('kind');
    const createdAt = timestamp(at);
    return new Product({
      id: entityId(id),
      organizationId: entityId(organizationId, 'organizationId'),
      kind,
      ...details(input),
      createdAt,
      updatedAt: createdAt,
    });
  }

  updateDetails(changes: ProductDetailsChanges, at: Date): Product {
    const updatedDetails = details({
      name: changes.name === undefined ? this.name : changes.name,
      description: changes.description === undefined ? this.description : changes.description,
      regularPrice: changes.regularPrice === undefined ? this.regularPrice : changes.regularPrice,
      imageAssetIds:
        changes.imageAssetIds === undefined ? this.imageAssetIds : changes.imageAssetIds,
    });
    return new Product({
      ...this.#state,
      ...updatedDetails,
      updatedAt: timestamp(at, this.#state.updatedAt),
    });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get organizationId(): EntityId {
    return this.#state.organizationId;
  }
  get kind(): ProductKind {
    return this.#state.kind;
  }
  get name(): string {
    return this.#state.name;
  }
  get description(): string {
    return this.#state.description;
  }
  get regularPrice(): Money {
    return this.#state.regularPrice;
  }
  get imageAssetIds(): readonly EntityId[] {
    return this.#state.imageAssetIds;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
