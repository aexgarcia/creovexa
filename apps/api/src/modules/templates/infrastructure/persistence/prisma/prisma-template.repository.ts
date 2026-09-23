import type { EntityId } from '#app/domain/entity-id';
import { pagination, type Page, type Pagination } from '#app/domain/pagination';
import type { PrismaClient } from '#app/infrastructure/persistence/prisma/generated/client';
import { translatePrismaError } from '#app/infrastructure/persistence/prisma/translate-prisma-error';
import { PersistenceScopeError } from '#app/infrastructure/persistence/persistence.errors';
import type { Template } from '../../../domain/entities/template.js';
import type { TemplateRepository } from '../../../domain/repositories/template.repository.js';
import { InvalidTemplateRevisionError } from '../../../domain/errors/template.errors.js';
import { TemplateMapper } from './template.mapper.js';

export class PrismaTemplateRepository implements TemplateRepository {
  constructor(private readonly client: PrismaClient) {}

  findById(organizationId: EntityId, templateId: EntityId): Promise<Template | null> {
    return this.client.$transaction(
      async (tx) => {
        const row = await tx.template.findUnique({
          where: { organizationId_id: { organizationId, id: templateId } },
          include: { currentRevision: true },
        });
        return row === null ? null : TemplateMapper.toDomain(row);
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  list(organizationId: EntityId, input: Pagination): Promise<Page<Template>> {
    const { page, limit } = pagination(input);
    return this.client.$transaction(
      async (tx) => {
        const where = { organizationId };
        const rows = await tx.template.findMany({
          where,
          include: { currentRevision: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        const total = await tx.template.count({ where });
        return { items: rows.map(TemplateMapper.toDomain), total };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

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
