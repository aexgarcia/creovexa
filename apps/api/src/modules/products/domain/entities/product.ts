import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { Money } from '#app/domain/value-objects/money';
import { InvalidProductError } from '../errors/product.errors.js';
import { ProductKind } from '../product-kind.js';
import { PhotoType, type ProductImageTraits } from '../photo-type.js';

export interface ProductDetails {
  name: string;
  description?: string;
  regularPrice: Money;
  // El nombre que va al flyer; el nombre completo queda para el catálogo y el copy.
  shortName?: string | null;
  // Marca de un tercero que vende la tienda (BAO Café en Café Andino).
  productBrand?: string | null;
  // Características que puede mostrar el flyer, por prioridad, escritas por el usuario.
  keyAttributes?: readonly string[];
  // Cómo se vende: "por kg", "por sesión", "c/u".
  unit?: string | null;
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
  shortName: string | null;
  productBrand: string | null;
  keyAttributes: readonly string[];
  unit: string | null;
  imageAssetIds: readonly EntityId[];
  imageTraits: ProductImageTraits | null;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export const SHORT_NAME_MAX_LENGTH = 40;
export const KEY_ATTRIBUTES_MAX = 5;
const KEY_ATTRIBUTE_MAX_LENGTH = 60;
const PRODUCT_BRAND_MAX_LENGTH = 80;
const UNIT_MAX_LENGTH = 30;

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || value.trim().length > max) throw new InvalidProductError(field);
  return value.trim() || null;
}

function keyAttributes(value: unknown): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > KEY_ATTRIBUTES_MAX)
    throw new InvalidProductError('keyAttributes');
  const list = value.map((item) => {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > KEY_ATTRIBUTE_MAX_LENGTH)
      throw new InvalidProductError('keyAttributes');
    return item.trim();
  });
  if (new Set(list.map((item) => item.toLocaleLowerCase('es'))).size !== list.length)
    throw new InvalidProductError('keyAttributes');
  return Object.freeze(list);
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
  if (!Array.isArray(imageAssetIds) || imageAssetIds.length > 1)
    throw new InvalidProductError('imageAssetIds');
  const normalizedIds = imageAssetIds.map((id: string) => entityId(id, 'imageAssetIds'));
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new InvalidProductError('imageAssetIds');
  }
  return {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    regularPrice: input.regularPrice,
    shortName: optionalText(input.shortName, 'shortName', SHORT_NAME_MAX_LENGTH),
    productBrand: optionalText(input.productBrand, 'productBrand', PRODUCT_BRAND_MAX_LENGTH),
    keyAttributes: keyAttributes(input.keyAttributes),
    unit: optionalText(input.unit, 'unit', UNIT_MAX_LENGTH),
    imageAssetIds: Object.freeze(normalizedIds),
  };
}

function traits(input: ProductImageTraits | null): ProductImageTraits | null {
  if (!input) return null;
  if (input.photoType !== null && !Object.values(PhotoType).includes(input.photoType))
    throw new InvalidProductError('photoType');
  if (input.hasTransparency !== null && typeof input.hasTransparency !== 'boolean')
    throw new InvalidProductError('hasTransparency');
  return Object.freeze({ photoType: input.photoType, hasTransparency: input.hasTransparency });
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
    return Product.restore(id, organizationId, kind, input, at, at);
  }

  static restore(
    id: string,
    organizationId: string,
    kind: ProductKind,
    input: ProductDetails,
    created: Date,
    updated: Date,
    imageTraits: ProductImageTraits | null = null,
    archived: Date | null = null,
  ): Product {
    if (!Object.values(ProductKind).includes(kind)) throw new InvalidProductError('kind');
    const createdAt = timestamp(created);
    const restored = details(input);
    return new Product({
      id: entityId(id),
      organizationId: entityId(organizationId, 'organizationId'),
      kind,
      ...restored,
      archivedAt: archived === null ? null : timestamp(archived, createdAt),
      imageTraits: restored.imageAssetIds.length ? traits(imageTraits) : null,
      createdAt,
      updatedAt: timestamp(updated, createdAt),
    });
  }

  updateDetails(changes: ProductDetailsChanges, at: Date): Product {
    const updatedDetails = details({
      name: changes.name === undefined ? this.name : changes.name,
      description: changes.description === undefined ? this.description : changes.description,
      regularPrice: changes.regularPrice === undefined ? this.regularPrice : changes.regularPrice,
      shortName: changes.shortName === undefined ? this.shortName : changes.shortName,
      productBrand: changes.productBrand === undefined ? this.productBrand : changes.productBrand,
      keyAttributes:
        changes.keyAttributes === undefined ? this.keyAttributes : changes.keyAttributes,
      unit: changes.unit === undefined ? this.unit : changes.unit,
      imageAssetIds:
        changes.imageAssetIds === undefined ? this.imageAssetIds : changes.imageAssetIds,
    });
    const sameImage = updatedDetails.imageAssetIds[0] === this.imageAssetIds[0];
    return new Product({
      ...this.#state,
      ...updatedDetails,
      // Los datos de la imagen son de la imagen actual; con otra, o sin imagen, dejan de valer.
      imageTraits: sameImage ? this.imageTraits : null,
      updatedAt: timestamp(at, this.#state.updatedAt),
    });
  }

  withArchiveDate(at: Date | null): Product {
    return new Product({
      ...this.#state,
      archivedAt: at === null ? null : timestamp(at, this.#state.createdAt),
    });
  }

  get archivedAt(): Date | null {
    return this.#state.archivedAt === null ? null : new Date(this.#state.archivedAt);
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
  get shortName(): string | null {
    return this.#state.shortName;
  }
  /** El nombre que va al flyer: el corto si existe; si no, el completo. */
  get flyerName(): string {
    return this.#state.shortName ?? this.#state.name;
  }
  get productBrand(): string | null {
    return this.#state.productBrand;
  }
  get keyAttributes(): readonly string[] {
    return this.#state.keyAttributes;
  }
  get unit(): string | null {
    return this.#state.unit;
  }
  get imageAssetIds(): readonly EntityId[] {
    return this.#state.imageAssetIds;
  }
  get imageTraits(): ProductImageTraits | null {
    return this.#state.imageTraits;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
