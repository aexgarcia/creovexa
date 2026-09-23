import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import {
  InvalidTemplateDimensionsError,
  InvalidTemplateRevisionError,
  UnsupportedTemplateDimensionsError,
} from '../errors/template.errors.js';
import { TemplateDimensions } from '../value-objects/template-dimensions.js';

interface TemplateRevisionState {
  id: EntityId;
  templateId: EntityId;
  organizationId: EntityId;
  number: number;
  dimensions: TemplateDimensions;
  createdAt: number;
}

function supportedDimensions(dimensions: TemplateDimensions): TemplateDimensions {
  if (!(dimensions instanceof TemplateDimensions)) throw new InvalidTemplateDimensionsError();
  if (dimensions.width !== 1080 || dimensions.height !== 1080) {
    throw new UnsupportedTemplateDimensionsError();
  }
  return dimensions;
}

export class TemplateRevision {
  readonly #state: Readonly<TemplateRevisionState>;

  private constructor(state: TemplateRevisionState) {
    this.#state = Object.freeze(state);
    Object.freeze(this);
  }

  static initial(
    id: string,
    templateId: string,
    organizationId: string,
    dimensions: TemplateDimensions,
    at: Date,
  ): TemplateRevision {
    return new TemplateRevision({
      id: entityId(id, 'revisionId'),
      templateId: entityId(templateId, 'templateId'),
      organizationId: entityId(organizationId, 'organizationId'),
      number: 1,
      dimensions: supportedDimensions(dimensions),
      createdAt: timestamp(at),
    });
  }

  next(id: string, dimensions: TemplateDimensions, at: Date): TemplateRevision {
    const revisionId = entityId(id, 'revisionId');
    const number = this.number + 1;
    if (revisionId === this.id || !Number.isSafeInteger(number)) {
      throw new InvalidTemplateRevisionError();
    }
    return new TemplateRevision({
      ...this.#state,
      id: revisionId,
      number,
      dimensions: supportedDimensions(dimensions),
      createdAt: timestamp(at, this.#state.createdAt),
    });
  }

  static restore(
    id: string,
    templateId: string,
    organizationId: string,
    number: number,
    dimensions: TemplateDimensions,
    at: Date,
  ): TemplateRevision {
    if (!Number.isSafeInteger(number) || number < 1) throw new InvalidTemplateRevisionError();
    const initial = TemplateRevision.initial(id, templateId, organizationId, dimensions, at);
    return new TemplateRevision({ ...initial.#state, number });
  }

  get id(): EntityId {
    return this.#state.id;
  }
  get templateId(): EntityId {
    return this.#state.templateId;
  }
  get organizationId(): EntityId {
    return this.#state.organizationId;
  }
  get number(): number {
    return this.#state.number;
  }
  get dimensions(): TemplateDimensions {
    return this.#state.dimensions;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
}
