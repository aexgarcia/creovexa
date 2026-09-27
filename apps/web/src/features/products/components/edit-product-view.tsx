'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';

import { useProduct } from '../hooks/use-product';
import { useUpdateProduct } from '../hooks/use-update-product';

import { productInput, type ProductFormValues } from '../schemas/product.schema';

import { ProductForm } from './product-form';

interface EditProductViewProps {
  productId: string;
}

export function EditProductView({ productId }: EditProductViewProps) {
  const router = useRouter();

  const { data: product, isLoading, isError, error, refetch } = useProduct(productId);

  const updateProduct = useUpdateProduct();

  async function handleSubmit(values: ProductFormValues) {
    try {
      await updateProduct.mutateAsync({
        id: productId,
        input: {
          name: values.name,
          description: values.description,
          regularPrice: productInput(values).regularPrice,
        },
      });

      toast.success('Producto actualizado correctamente');

      router.push('/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el producto');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <p className="font-medium text-destructive">{error?.message ?? 'Producto no encontrado'}</p>

        <p className="mt-1 text-sm text-muted-foreground">
          <button type="button" onClick={() => void refetch()} className="underline">
            Volver a intentar
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar producto"
        description="Modifica la información del producto seleccionado."
      />

      <ProductForm
        key={product.id}
        product={product}
        onSubmit={handleSubmit}
        isSubmitting={updateProduct.isPending}
      />
    </div>
  );
}
