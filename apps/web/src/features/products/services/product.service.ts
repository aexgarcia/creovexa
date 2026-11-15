import { apiRequest, apiUrl, type ApiPage } from '@/lib/api-client';
import type {
  CreateProductInput,
  PhotoType,
  Product,
  UpdateProductInput,
} from '../types/product.types';
class ProductService {
  async findAll(page = 1, signal?: AbortSignal): Promise<ApiPage<Product>> {
    const result = await apiRequest<ApiPage<Product>>('/products?page=' + page + '&limit=20', {
      signal,
    });
    return { ...result, data: result.data.map(resolveImage) };
  }
  async findById(id: string, signal?: AbortSignal): Promise<Product> {
    return resolveImage(
      (await apiRequest<{ data: Product }>('/products/' + encodeURIComponent(id), { signal })).data,
    );
  }
  async create(input: CreateProductInput): Promise<Product> {
    return resolveImage(
      (
        await apiRequest<{ data: Product }>('/products', {
          method: 'POST',
          body: JSON.stringify(input),
        })
      ).data,
    );
  }
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    return resolveImage(
      (
        await apiRequest<{ data: Product }>('/products/' + encodeURIComponent(id), {
          method: 'PATCH',
          body: JSON.stringify(input),
        })
      ).data,
    );
  }
  async uploadImage(id: string, file: File, photoType: PhotoType): Promise<Product> {
    const body = new FormData();
    body.append('photoType', photoType);
    body.append('image', file);
    const result = await apiRequest<{ data: Product }>(
      '/products/' + encodeURIComponent(id) + '/image',
      {
        method: 'POST',
        body,
      },
      45000,
    );
    return resolveImage(result.data);
  }
}
function resolveImage(product: Product): Product {
  return {
    ...product,
    imageUrl: product.imageUrl?.startsWith('/') ? apiUrl(product.imageUrl) : product.imageUrl,
  };
}
export const productService = new ProductService();
