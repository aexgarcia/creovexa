import type {
  Template as TemplateRecord,
  TemplateRevision as RevisionRecord,
} from '#app/infrastructure/persistence/prisma/generated/client';
import type { Template } from '../../../domain/entities/template.js';

export class TemplateMapper {
  static toPersistence(template: Template): { template: TemplateRecord; revision: RevisionRecord } {
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
        createdAt: revision.createdAt,
      },
    };
  }
}
