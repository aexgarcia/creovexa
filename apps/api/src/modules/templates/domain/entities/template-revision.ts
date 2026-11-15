import { entityId, type EntityId } from '#app/domain/entity-id';
import { timestamp } from '#app/domain/timestamp';
import { FlyerDesign, type FlyerDesignData } from '#app/domain/value-objects/flyer-design';
import {
  InvalidTemplateDimensionsError,
  InvalidTemplateRevisionError,
} from '../errors/template.errors.js';
import { TemplateDimensions } from '../value-objects/template-dimensions.js';

interface TemplateRevisionState {
  id: EntityId;
  templateId: EntityId;
  organizationId: EntityId;
  number: number;
  dimensions: TemplateDimensions;
  design: FlyerDesignData;
  createdAt: number;
}

// Las dimensiones salen del formato del diseño; no se eligen aparte.
function designed(design: unknown) {
  const flyer = FlyerDesign.create(design);
  return {
    design: flyer.data,
    dimensions: TemplateDimensions.create(flyer.size.width, flyer.size.height),
  };
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
    at: Date,
    design?: unknown,
  ): TemplateRevision {
    return new TemplateRevision({
      id: entityId(id, 'revisionId'),
      templateId: entityId(templateId, 'templateId'),
      organizationId: entityId(organizationId, 'organizationId'),
      number: 1,
      ...designed(design),
      createdAt: timestamp(at),
    });
  }

  next(id: string, at: Date, design: unknown = this.design): TemplateRevision {
    const revisionId = entityId(id, 'revisionId');
    const number = this.number + 1;
    if (revisionId === this.id || !Number.isSafeInteger(number)) {
      throw new InvalidTemplateRevisionError();
    }
    return new TemplateRevision({
      ...this.#state,
      id: revisionId,
      number,
      ...designed(design),
      createdAt: timestamp(at, this.#state.createdAt),
    });
  }

  /** stored: las dimensiones guardadas, que deben ser las del formato del diseño. */
  static restore(
    id: string,
    templateId: string,
    organizationId: string,
    number: number,
    stored: TemplateDimensions,
    at: Date,
    design?: unknown,
  ): TemplateRevision {
    if (!Number.isSafeInteger(number) || number < 1) throw new InvalidTemplateRevisionError();
    const initial = TemplateRevision.initial(id, templateId, organizationId, at, design);
    if (!(stored instanceof TemplateDimensions) || !stored.equals(initial.dimensions))
      throw new InvalidTemplateDimensionsError();
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
  get design(): FlyerDesignData {
    return this.#state.design;
  }
  get createdAt(): Date {
    return new Date(this.#state.createdAt);
  }
}
