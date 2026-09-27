'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { useProducts } from '../hooks/use-products';
import { ProductEmptyState } from './product-empty-state';
import { ProductTable } from './product-table';
export function ProductList() {
  const [page, setPage] = useState(1);
  const { data: products, meta, isPending, error, refetch, isFetching } = useProducts(page);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Administra los productos y servicios utilizados en tus campañas."
        actions={
          <Button nativeButton={false} render={<Link href="/products/new" />}>
            Nuevo producto
          </Button>
        }
      />
      {isPending ? (
        <div role="status" aria-label="Cargando productos">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-xl border p-6">
          <p>{error.message}</p>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{meta?.total ?? 0} productos y servicios</p>
          {products?.length ? (
            <ProductTable products={products} />
          ) : page === 1 ? (
            <ProductEmptyState />
          ) : (
            <p>No hay productos en esta página.</p>
          )}
        </>
      )}
      <nav aria-label="Páginas de productos" className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={page === 1 || isFetching}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <span>
          Página {page}
          {meta ? ' de ' + Math.max(1, meta.totalPages) : ''}
        </span>
        <Button
          variant="outline"
          disabled={isFetching || !meta || page >= meta.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </nav>
    </div>
  );
}
