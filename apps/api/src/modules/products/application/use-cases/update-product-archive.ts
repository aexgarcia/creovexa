import type { Clock } from '#app/application/ports/clock';
import { entityId } from '#app/domain/entity-id';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../../domain/errors/product.errors.js';
import { productResult } from '../product-result.js';

export class UpdateProductArchive {
  constructor(
    private readonly repository: ProductRepository,
    private readonly clock: Clock,
  ) {}
  async execute(input: { organizationId: string; id: string; archived: boolean }) {
    const organizationId = entityId(input.organizationId, 'organizationId');
    const id = entityId(input.id);
    const original = await this.repository.findById(organizationId, id);
    if (!original) throw new ProductNotFoundError();
    const updated = original.withArchiveDate(
      input.archived ? (original.archivedAt ?? this.clock.now()) : null,
    );
    await this.repository.setArchivedAt(organizationId, id, updated.archivedAt);
    const current = await this.repository.findById(organizationId, id);
    if (!current) throw new ProductNotFoundError();
    return productResult(current);
  }
}
