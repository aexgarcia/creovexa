import { EditProductView } from '@/features/products/components/edit-product-view';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  return <EditProductView productId={id} />;
}
