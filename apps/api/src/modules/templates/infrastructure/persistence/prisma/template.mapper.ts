import type {
  Template as TemplateRecord,
  TemplateRevision as RevisionRecord,
} from '#app/infrastructure/persistence/prisma/generated/client';
import { Template } from '../../../domain/entities/template.js';
import { TemplateRevision } from '../../../domain/entities/template-revision.js';
import { TemplateDimensions } from '../../../domain/value-objects/template-dimensions.js';
import { InvalidTemplateRevisionError } from '../../../domain/errors/template.errors.js';

export class TemplateMapper {
  static toDomain(row: TemplateRecord & { currentRevision: RevisionRecord }): Template {
    const revision = row.currentRevision;
    if (row.currentRevisionId !== revision.id) throw new InvalidTemplateRevisionError();
    return Template.restore(
      row.id,
      row.organizationId,
      row.name,
      TemplateRevision.restore(
        revision.id,
        revision.templateId,
        revision.organizationId,
        Number(revision.number),
        TemplateDimensions.create(revision.width, revision.height),
        revision.createdAt,
        revision.design,
      ),
      row.createdAt,
      row.updatedAt,
    );
  }

  static toPersistence(template: Template): {
    template: TemplateRecord;
    // Un tipo concreto que sirve tanto para escribir como para volver a leer la fila.
    revision: Omit<RevisionRecord, 'design'> & {
      design: Record<string, string | null | string[] | Record<string, boolean | number>>;
    };
  } {
    const revision = template.currentRevision;
    return {
      template: {
        id: template.id,
        organizationId: template.organizationId,
        name: template.name,
        currentRevisionId: revision.id,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      revision: {
        id: revision.id,
        organizationId: revision.organizationId,
        templateId: revision.templateId,
        number: BigInt(revision.number),
        width: revision.dimensions.width,
        height: revision.dimensions.height,
        design: {
          ...revision.design,
          elements: { ...revision.design.elements },
          styleReferenceAssetIds: [...revision.design.styleReferenceAssetIds],
        },
        createdAt: revision.createdAt,
      },
    };
  }
}
