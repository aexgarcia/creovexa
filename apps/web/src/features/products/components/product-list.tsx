'use client';
import { Package, Plus } from 'lucide-react';
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
            <Plus className="mr-2 size-4" /> Nuevo producto
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
          <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Package className="size-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{meta?.total ?? 0}</p>
              <p className="text-sm text-muted-foreground">productos y servicios</p>
            </div>
          </div>
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
