'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api-client';

import { useProduct } from '../hooks/use-product';
import { useUpdateProduct } from '../hooks/use-update-product';
import { useUploadProductImage } from '../hooks/use-upload-product-image';

import { productChanges, type ProductFormValues } from '../schemas/product.schema';

import { ProductForm } from './product-form';

interface EditProductViewProps {
  productId: string;
}

export function EditProductView({ productId }: EditProductViewProps) {
  const router = useRouter();

  const { data: product, isLoading, isError, error, refetch } = useProduct(productId);

  const updateProduct = useUpdateProduct();
  const upload = useUploadProductImage();

  async function handleSubmit(values: ProductFormValues, image: File | null) {
    let productSaved = false;
    try {
      await updateProduct.mutateAsync({ id: productId, input: productChanges(values) });
      productSaved = true;
      if (image && values.photoType)
        await upload.mutateAsync({ id: productId, file: image, photoType: values.photoType });

      toast.success('Producto actualizado correctamente');

      router.push('/products');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'No se pudo actualizar el producto.';
      toast.error(
        productSaved && image
          ? 'Los datos se guardaron; no se pudo reemplazar la imagen. Puedes reintentar.' +
              (error instanceof ApiError
                ? ' ' + message
                : ' Recarga la página e inténtalo de nuevo.')
          : message,
      );
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
        isSubmitting={updateProduct.isPending || upload.isPending}
      />
    </div>
  );
}
