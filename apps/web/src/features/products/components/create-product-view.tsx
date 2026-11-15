'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { ApiError } from '@/lib/api-client';
import type { Product } from '../types/product.types';
import { productService } from '../services/product.service';
import { useUploadProductImage } from '../hooks/use-upload-product-image';

import { useCreateProduct } from '../hooks/use-create-product';
import { productChanges, productInput, type ProductFormValues } from '../schemas/product.schema';

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
        ? await productService.update(created.id, productChanges(values))
        : await createProduct.mutateAsync(input);
      setCreated(result);
      productSaved = true;
      if (image && values.photoType)
        await upload.mutateAsync({ id: result.id, file: image, photoType: values.photoType });

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
      <ProductForm
        title="Nuevo producto"
        description="Registra un nuevo producto o servicio para utilizarlo en campañas."
        product={created ?? undefined}
        onSubmit={handleSubmit}
        isSubmitting={createProduct.isPending || upload.isPending}
      />
    </div>
  );
}
