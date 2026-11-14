'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import type { Product } from '../types/product.types';
import { productService } from '../services/product.service';
import { useUploadProductImage } from '../hooks/use-upload-product-image';

import { PageHeader } from '@/components/layout/page-header';

import { useCreateProduct } from '../hooks/use-create-product';
import { productInput, type ProductFormValues } from '../schemas/product.schema';

import { ProductForm } from './product-form';

export function CreateProductView() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const upload = useUploadProductImage();
  const [created, setCreated] = useState<Product | null>(null);

  async function handleSubmit(values: ProductFormValues, image: File | null) {
    let productSaved = false;
    try {
      const input = productInput(values);
      const result = created
        ? await productService.update(created.id, {
            name: input.name,
            description: input.description,
            regularPrice: input.regularPrice,
          })
        : await createProduct.mutateAsync(input);
      setCreated(result);
      productSaved = true;
      if (image) await upload.mutateAsync({ id: result.id, file: image });

      toast.success('Producto creado correctamente');

      router.push('/products');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo crear el producto.';
      toast.error(
        productSaved && image
          ? 'El producto se guardó, pero la imagen no pudo subirse. Puedes reintentar.' +
              (error instanceof ApiError
                ? ' ' + message
                : ' Recarga la página e inténtalo de nuevo.')
          : message,
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo producto"
        description="Registra un nuevo producto o servicio para utilizarlo en campañas."
      />

      <ProductForm
        product={created ?? undefined}
        onSubmit={handleSubmit}
        isSubmitting={createProduct.isPending || upload.isPending}
      />
    </div>
  );
}
