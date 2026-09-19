import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { InvalidTemplateNameError } from '../errors/template.errors.js';
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
