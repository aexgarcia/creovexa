import { ImageGenerationError } from '#app/modules/content-generation/application/errors/image-generation.error';
import type { ProductImages } from '#app/modules/products/application/ports/product-images';
import { ProductImageError } from '#app/modules/products/application/errors/product-image.error';
import type {
  ProductImageSource,
  LoadProductImageInput,
} from '../application/ports/product-image-source.js';

import { LocalImageArtifacts } from './local-image-artifacts.js';

export class StoredProductImageSource implements ProductImageSource {
  constructor(
    private readonly images: ProductImages,
    private readonly artifacts: LocalImageArtifacts,
  ) {}
  assertAvailable() {
    try {
      this.images.assertAvailable();
    } catch {
      throw new ImageGenerationError('UNAVAILABLE');
    }
  }
  async load(input: LoadProductImageInput) {
    try {
      const image = await this.images.read({
        organizationId: input.organizationId,
        productId: input.productId,
        assetId: input.imageAssetId,
      });
      if (!image) throw new ImageGenerationError('PRODUCT_IMAGE_REQUIRED');
      return {
        reference: await this.artifacts.write(input, image.bytes),
        contentType: image.contentType,
        width: image.width,
        height: image.height,
      };
    } catch (error) {
      if (error instanceof ImageGenerationError) throw error;
      if (error instanceof ProductImageError) throw new ImageGenerationError('UNAVAILABLE');
      throw error;
    }
  }
}
