import { entityId } from '#app/domain/entity-id';
import type { Clock } from '#app/application/ports/clock';
import type { IdGenerator } from '#app/application/ports/id-generator';
import type { ProductRepository } from '../../domain/repositories/product.repository.js';
import { ProductNotFoundError } from '../../domain/errors/product.errors.js';
import type { ProductImages } from '../ports/product-images.js';
import { ProductImageError } from '../errors/product-image.error.js';
import { productResult } from '../product-result.js';

export class SaveProductImage {
  constructor(
    private readonly products: ProductRepository,
    private readonly images: ProductImages,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: { organizationId: string; productId: string; bytes: Uint8Array }) {
    const organizationId = entityId(input.organizationId);
    const productId = entityId(input.productId);
    const product = await this.products.findById(organizationId, productId);
    if (!product || product.organizationId !== organizationId || product.id !== productId)
      throw new ProductNotFoundError();
    if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength === 0)
      throw new ProductImageError('INVALID_IMAGE');
    if (input.bytes.byteLength > 10 * 1024 * 1024) throw new ProductImageError('TOO_LARGE');
    const at = new Date(Math.max(this.clock.now().getTime(), product.updatedAt.getTime() + 1));
    await this.images.save({
      organizationId,
      productId,
      assetId: entityId(this.ids.next()),
      bytes: input.bytes,
      at,
      expectedUpdatedAt: product.updatedAt,
    });
    const updated = await this.products.findById(organizationId, productId);
    if (!updated) throw new ProductNotFoundError();
    return productResult(updated);
  }
}
