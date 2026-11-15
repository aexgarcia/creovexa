import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import { entityId } from '#app/domain/entity-id';
import { MAX_STYLE_REFERENCES } from '#app/domain/value-objects/flyer-design';
import type { Template } from '../../domain/entities/template.js';
import type { TemplateRepository } from '../../domain/repositories/template.repository.js';
import {
  TemplateNotFoundError,
  TemplateRevisionConflictError,
} from '../../domain/errors/template.errors.js';
import { TemplateStyleReferenceError } from '../errors/template-style-reference.error.js';
import type { TemplateStyleReferences } from '../ports/template-style-references.js';
import { templateResult, type TemplateResult } from '../template-result.js';

const MAX_BYTES = 10 * 1024 * 1024;

async function currentTemplate(
  templates: TemplateRepository,
  input: { organizationId: string; templateId: string; expectedRevisionId: string },
) {
  const owner = entityId(input.organizationId);
  const id = entityId(input.templateId);
  const expected = entityId(input.expectedRevisionId);
  const template = await templates.findById(owner, id);
  if (!template || template.organizationId !== owner) throw new TemplateNotFoundError();
  if (template.currentRevision.id !== expected) throw new TemplateRevisionConflictError();
  return { owner, template, expected };
}

/** Sube una referencia de estilo y crea la revisión que la incluye. */
export class AddTemplateStyleReference {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly references: TemplateStyleReferences,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    organizationId: string;
    templateId: string;
    expectedRevisionId: string;
    bytes: Uint8Array;
  }): Promise<TemplateResult> {
    const { owner, template, expected } = await currentTemplate(this.templates, input);
    const current = template.currentRevision.design.styleReferenceAssetIds;
    if (current.length >= MAX_STYLE_REFERENCES) throw new TemplateStyleReferenceError('LIMIT');
    if (!(input.bytes instanceof Uint8Array) || !input.bytes.byteLength)
      throw new TemplateStyleReferenceError('INVALID_IMAGE');
    if (input.bytes.byteLength > MAX_BYTES) throw new TemplateStyleReferenceError('TOO_LARGE');
    const assetId = entityId(this.ids.next());
    const at = this.clock.now();
    // Si la revisión falla después, el archivo queda sin usar; es inmutable y no se borra.
    await this.references.save({
      organizationId: owner,
      templateId: template.id,
      assetId,
      bytes: input.bytes,
      at,
    });
    return save(
      this.templates,
      owner,
      expected,
      template.withStyleReferences(this.ids.next(), at, [...current, assetId]),
    );
  }
}

/** Crea una revisión sin esa referencia; el archivo sigue legible para revisiones anteriores. */
export class RemoveTemplateStyleReference {
  constructor(
    private readonly templates: TemplateRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    organizationId: string;
    templateId: string;
    expectedRevisionId: string;
    assetId: string;
  }): Promise<TemplateResult> {
    const { owner, template, expected } = await currentTemplate(this.templates, input);
    const assetId = entityId(input.assetId);
    const current = template.currentRevision.design.styleReferenceAssetIds;
    if (!current.includes(assetId)) throw new TemplateStyleReferenceError('NOT_FOUND');
    return save(
      this.templates,
      owner,
      expected,
      template.withStyleReferences(
        this.ids.next(),
        this.clock.now(),
        current.filter((id) => id !== assetId),
      ),
    );
  }
}

/** Lee los bytes de una referencia de la plantilla, de esta o de una revisión anterior. */
export class GetTemplateStyleReference {
  constructor(private readonly references: TemplateStyleReferences) {}

  async execute(input: { organizationId: string; templateId: string; assetId: string }) {
    const reference = await this.references.read({
      organizationId: entityId(input.organizationId),
      templateId: entityId(input.templateId),
      assetId: entityId(input.assetId),
    });
    if (!reference) throw new TemplateStyleReferenceError('NOT_FOUND');
    return reference;
  }
}

async function save(
  templates: TemplateRepository,
  owner: ReturnType<typeof entityId>,
  expected: ReturnType<typeof entityId>,
  updated: Template,
) {
  await templates.save(owner, updated, expected);
  return templateResult(updated);
}
