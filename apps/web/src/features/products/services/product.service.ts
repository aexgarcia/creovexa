import { apiRequest, type ApiPage } from '@/lib/api-client';
import type { CreateProductInput, Product, UpdateProductInput } from '../types/product.types';
class ProductService {
  findAll(page = 1, signal?: AbortSignal): Promise<ApiPage<Product>> {
    return apiRequest('/products?page=' + page + '&limit=20', { signal });
  }
  async findById(id: string, signal?: AbortSignal): Promise<Product> {
    return (await apiRequest<{ data: Product }>('/products/' + encodeURIComponent(id), { signal }))
      .data;
  }
  async create(input: CreateProductInput): Promise<Product> {
    return (
      await apiRequest<{ data: Product }>('/products', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    ).data;
  }
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    return (
      await apiRequest<{ data: Product }>('/products/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    ).data;
  }
}
export const productService = new ProductService();
