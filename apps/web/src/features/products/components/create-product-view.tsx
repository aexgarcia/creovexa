'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';

import { useCreateProduct } from '../hooks/use-create-product';
import { productInput, type ProductFormValues } from '../schemas/product.schema';

import { ProductForm } from './product-form';

export function CreateProductView() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  async function handleSubmit(values: ProductFormValues) {
    try {
      await createProduct.mutateAsync(productInput(values));

      toast.success('Producto creado correctamente');

      router.push('/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el producto');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo producto"
        description="Registra un nuevo producto o servicio para utilizarlo en campañas."
      />

      <ProductForm onSubmit={handleSubmit} isSubmitting={createProduct.isPending} />
    </div>
  );
}
