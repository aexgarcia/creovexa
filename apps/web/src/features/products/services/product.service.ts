import { apiRequest, apiUrl, type ApiPage } from '@/lib/api-client';
import type {
  CreateProductInput,
  PhotoType,
  Product,
  SalesSuggestion,
  SalesSuggestionInput,
  UpdateProductInput,
} from '../types/product.types';
import type { CatalogStatus } from '@/types/catalog-status';

class ProductService {
  async setArchived(id: string, archived: boolean): Promise<Product> {
    const result = await apiRequest<{ data: Product }>(
      '/products/' + encodeURIComponent(id) + '/archive',
      { method: 'PATCH', body: JSON.stringify({ archived }) },
    );
    return resolveImage(result.data);
  }

  async findAll(
    page = 1,
    signal?: AbortSignal,
    status: CatalogStatus = 'active',
  ): Promise<ApiPage<Product>> {
    const result = await apiRequest<ApiPage<Product>>(
      '/products?page=' + page + '&limit=20&status=' + status,
      {
        signal,
      },
    );
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
  /** Si el despliegue permite pedir sugerencias con IA (ADR-0031). */
  async salesSuggestionsAvailable(signal?: AbortSignal): Promise<boolean> {
    return (
      await apiRequest<{ data: { available: boolean } }>('/products/sales-suggestions/status', {
        signal,
      })
    ).data.available;
  }
  /** Propone beneficios y «para quién es» sin guardar nada; cada llamada cuesta una consulta a la IA. */
  async suggestSalesData(input: SalesSuggestionInput): Promise<SalesSuggestion> {
    return (
      await apiRequest<{ data: SalesSuggestion }>(
        '/products/sales-suggestions',
        { method: 'POST', body: JSON.stringify(input) },
        45000,
      )
    ).data;
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
