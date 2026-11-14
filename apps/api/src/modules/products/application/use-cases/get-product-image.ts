import { entityId } from '#app/domain/entity-id';
import type { ProductImages } from '../ports/product-images.js';
import { ProductImageError } from '../errors/product-image.error.js';

export class GetProductImage {
  constructor(private readonly images: ProductImages) {}
  async execute(input: { organizationId: string; productId: string; assetId: string }) {
    const image = await this.images.read({
      organizationId: entityId(input.organizationId),
      productId: entityId(input.productId),
      assetId: entityId(input.assetId),
    });
    if (!image) throw new ProductImageError('NOT_FOUND');
    return image;
  }
}
