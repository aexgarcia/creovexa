'use client';
import { Package, Plus, Search, BriefcaseBusiness } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { CollectionPagination } from '@/components/layout/collection-pagination';
import { useProducts } from '../hooks/use-products';
import type { ProductKind } from '../types/product.types';
import { ProductEmptyState } from './product-empty-state';
import { ProductTable } from './product-table';

export function ProductList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ProductKind | 'ALL'>('ALL');
  const [sort, setSort] = useState('recent');
  const { data: products, meta, isPending, error, refetch, isFetching } = useProducts(page);
  const term = search.trim().toLocaleLowerCase('es');
  const visible = (products ?? [])
    .filter(
      (product) =>
        (kind === 'ALL' || product.kind === kind) &&
        (!term ||
          (product.name + ' ' + product.description).toLocaleLowerCase('es').includes(term)),
    )
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort.startsWith('price'))
        return (
          a.regularPrice.currency.localeCompare(b.regularPrice.currency) ||
          (sort === 'price-asc'
            ? a.regularPrice.amountMinor - b.regularPrice.amountMinor
            : b.regularPrice.amountMinor - a.regularPrice.amountMinor)
        );
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  const filtered = Boolean(term) || kind !== 'ALL';
  return (
    <div className="space-y-6">
      <PageHeader
        title="Productos"
        description="Lo que vendes y quieres promocionar. La IA usa estos datos y fotos para diseñar tus flyers."
        actions={
          <Button nativeButton={false} render={<Link href="/products/new" />}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 lg:max-w-[380px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
          />
          <Input
            aria-label="Buscar productos en esta página"
            placeholder="Buscar por nombre o descripción"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-10"
          />
        </div>
        <div
          role="group"
          aria-label="Filtrar por tipo"
          className="inline-flex gap-0.5 rounded-[11px] border border-input bg-control p-[3px]"
        >
          {(
            [
              { value: 'ALL', label: 'Todos', icon: null },
              { value: 'PRODUCT', label: 'Productos', icon: Package },
              { value: 'SERVICE', label: 'Servicios', icon: BriefcaseBusiness },
            ] as const
          ).map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={kind === option.value}
              onClick={() => setKind(option.value)}
              className={[
                'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                kind === option.value
                  ? 'border-input bg-accent text-foreground shadow-sm'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {option.icon && <option.icon aria-hidden="true" className="size-3.5" />}
              {option.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Ordenar productos de esta página"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-10 w-full rounded-[10px] border border-input bg-control px-3 text-[13px] sm:ml-auto sm:w-auto"
        >
          <option value="recent">Más recientes</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="name">Nombre (A–Z)</option>
        </select>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground" aria-live="polite">
        Búsqueda, filtros y orden en esta página.
        {sort.startsWith('price') ? ' Los precios se agrupan por moneda.' : ''}
        {filtered && !isPending && !error ? ' ' + visible.length + ' coincidencias.' : ''}
      </p>
      {isPending ? (
        <div role="status" aria-label="Cargando productos">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-2xl border bg-card p-6">
          <p>{error.message}</p>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            Reintentar
          </Button>
        </div>
      ) : !products?.length && page === 1 && !meta?.total ? (
        <ProductEmptyState />
      ) : (
        <div aria-busy={isFetching} className="overflow-hidden rounded-2xl border bg-card">
          {visible.length ? (
            <ProductTable products={visible} />
          ) : (
            <div className="space-y-2 p-12 text-center">
              <h2 className="font-medium">
                {filtered ? 'Sin coincidencias en esta página' : 'No hay productos en esta página'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filtered
                  ? 'Prueba con otro nombre o cambia el tipo.'
                  : 'Vuelve a la página anterior para ver el catálogo.'}
              </p>
              {filtered && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setKind('ALL');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
          {meta && (
            <CollectionPagination
              label="Páginas de productos"
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              busy={isFetching}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
