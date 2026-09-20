import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { InvalidOrganizationProfileError } from '../errors/organization.errors.js';

export interface OrganizationProfile {
  name: string;
  description?: string;
  brandTone?: string | null;
  logoAssetId?: string | null;
}

export type OrganizationProfileChanges = Partial<OrganizationProfile>;

interface OrganizationState {
  id: EntityId;
  name: string;
  description: string;
  brandTone: string | null;
  logoAssetId: EntityId | null;
  createdAt: number;
  updatedAt: number;
}

function text(value: string, field: string): string {
  if (typeof value !== 'string' || (field === 'name' && !value.trim())) {
    throw new InvalidOrganizationProfileError(field);
  }
  return value.trim();
}

function profile(input: OrganizationProfile) {
  return {
    name: text(input.name, 'name'),
    description: text(input.description === undefined ? '' : input.description, 'description'),
    brandTone: input.brandTone == null ? null : text(input.brandTone, 'brandTone') || null,
    logoAssetId: input.logoAssetId == null ? null : entityId(input.logoAssetId, 'logoAssetId'),
  };
}

export class Organization {
  readonly #state: Readonly<OrganizationState>;

  private constructor(state: OrganizationState) {
    this.#state = Object.freeze(state);
  }

  static create(id: string, input: OrganizationProfile, at: Date): Organization {
    return Organization.restore(id, input, at, at);
  }

  static restore(
    id: string,
    input: OrganizationProfile,
    created: Date,
    updated: Date,
  ): Organization {
    const createdAt = timestamp(created);
    return new Organization({
      id: entityId(id),
      ...profile(input),
      createdAt,
      updatedAt: timestamp(updated, createdAt),
    });
  }

  updateProfile(changes: OrganizationProfileChanges, at: Date): Organization {
    const updatedProfile = profile({
      name: changes.name === undefined ? this.name : changes.name,
      description: changes.description === undefined ? this.description : changes.description,
      brandTone: changes.brandTone === undefined ? this.brandTone : changes.brandTone,
      logoAssetId: changes.logoAssetId === undefined ? this.logoAssetId : changes.logoAssetId,
    });
    return new Organization({
      ...this.#state,
      ...updatedProfile,
      updatedAt: timestamp(at, this.#state.updatedAt),
    });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get name(): string {
    return this.#state.name;
  }
  get description(): string {
    return this.#state.description;
  }
  get brandTone(): string | null {
    return this.#state.brandTone;
  }
  get logoAssetId(): EntityId | null {
    return this.#state.logoAssetId;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
