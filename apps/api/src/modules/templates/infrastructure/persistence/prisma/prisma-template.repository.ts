import type { EntityId } from '#app/domain/entity-id';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import { PersistenceScopeError } from '#app/infrastructure/persistence/persistence.errors';
import type { Template } from '../../../domain/entities/template.js';
import type { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { InvalidTemplateRevisionError } from '../../../domain/errors/template.errors.js';
import { TemplateMapper } from './template.mapper.js';

export class PrismaTemplateRepository implements TemplateRepository {
  constructor(private readonly client: PrismaClient) {}

  async add(organizationId: EntityId, template: Template): Promise<void> {
    if (template.organizationId !== organizationId) throw new PersistenceScopeError();
    if (template.currentRevision.number !== 1) throw new InvalidTemplateRevisionError();
    const row = TemplateMapper.toPersistence(template);
    try {
      await this.client.$transaction(async (transaction) => {
        await transaction.template.create({ data: row.template });
        await transaction.templateRevision.create({ data: row.revision });
      });
    } catch (error) {
      translatePrismaError(error);
    }
  }
}
