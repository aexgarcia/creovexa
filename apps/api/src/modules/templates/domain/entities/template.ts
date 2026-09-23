import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import {
  InvalidTemplateNameError,
  InvalidTemplateRevisionError,
} from '../errors/template.errors.js';
import type { TemplateDimensions } from '../value-objects/template-dimensions.js';
import { TemplateRevision } from './template-revision.js';

export interface TemplateDetails {
  name: string;
  dimensions: TemplateDimensions;
}

interface TemplateState {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  currentRevision: TemplateRevision;
  createdAt: number;
  updatedAt: number;
}

export class Template {
  readonly #state: Readonly<TemplateState>;

  private constructor(state: TemplateState) {
    this.#state = Object.freeze(state);
  }

  static create(
    id: string,
    organizationId: string,
    revisionId: string,
    input: TemplateDetails,
    at: Date,
  ): Template {
    if (typeof input.name !== 'string' || !input.name.trim()) throw new InvalidTemplateNameError();
    const templateId = entityId(id, 'templateId');
    const ownerId = entityId(organizationId, 'organizationId');
    const createdAt = timestamp(at);
    return new Template({
      id: templateId,
      organizationId: ownerId,
      name: input.name.trim(),
      currentRevision: TemplateRevision.initial(
        revisionId,
        templateId,
        ownerId,
        input.dimensions,
        at,
      ),
      createdAt,
      updatedAt: createdAt,
    });
  }

  createRevision(id: string, dimensions: TemplateDimensions, at: Date): Template {
    const updatedAt = timestamp(at, this.#state.updatedAt);
    const currentRevision = this.currentRevision.next(id, dimensions, at);
    return new Template({ ...this.#state, currentRevision, updatedAt });
  }

  static restore(
    id: string,
    organizationId: string,
    name: string,
    revision: TemplateRevision,
    created: Date,
    updated: Date,
  ): Template {
    const templateId = entityId(id, 'templateId');
    const ownerId = entityId(organizationId, 'organizationId');
    if (typeof name !== 'string' || !name.trim()) throw new InvalidTemplateNameError();
    const createdAt = timestamp(created);
    const updatedAt = timestamp(updated, createdAt);
    if (
      !(revision instanceof TemplateRevision) ||
      revision.templateId !== templateId ||
      revision.organizationId !== ownerId ||
      revision.createdAt.getTime() !== updatedAt ||
      (revision.number === 1 && updatedAt !== createdAt)
    )
      throw new InvalidTemplateRevisionError();
    return new Template({
      id: templateId,
      organizationId: ownerId,
      name: name.trim(),
      currentRevision: revision,
      createdAt,
      updatedAt,
    });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get organizationId(): EntityId {
    return this.#state.organizationId;
  }
  get name(): string {
    return this.#state.name;
  }
  get currentRevision(): TemplateRevision {
    return this.#state.currentRevision;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
  get updatedAt(): Date {
    return new Date(this.#state.updatedAt);
  }
}
