'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Product } from '../types/product.types';
import { ProductActions } from './product-actions';
export function ProductTable({ products }: { products: Product[] }) {
  return (
    <div>
      <Table className="table-fixed text-sm [&_td]:px-3 [&_td]:py-3.5 [&_td:last-child]:px-2 [&_th]:px-3 md:[&_td]:px-5 md:[&_td:last-child]:px-2 md:[&_th]:px-5">
        <TableHeader>
          <TableRow className="bg-white/[0.015] text-xs uppercase tracking-[0.06em] [&_th]:font-medium [&_th]:text-muted-foreground">
            <TableHead className="w-auto">Producto</TableHead>
            <TableHead className="hidden w-[130px] md:table-cell">Tipo</TableHead>
            <TableHead className="w-[110px] sm:w-[140px]">
              Precio <span className="hidden sm:inline">regular</span>
            </TableHead>
            <TableHead className="hidden w-[140px] lg:table-cell">Actualizado</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <ProductThumbnail product={product} />
                  <div className="min-w-0">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="block truncate font-medium hover:text-brand-cyan"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-1 truncate text-[13px] text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span
                  className={
                    product.kind === 'PRODUCT'
                      ? 'rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-[#7fa0ff]'
                      : 'rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-1 text-xs text-[#a97cff]'
                  }
                >
                  {product.kind === 'PRODUCT' ? 'Producto' : 'Servicio'}
                </span>
              </TableCell>
              <TableCell className="font-mono text-[13px]">
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: product.regularPrice.currency,
                }).format(product.regularPrice.amountMinor / 100)}
              </TableCell>
              <TableCell className="hidden text-[13px] text-muted-foreground lg:table-cell">
                {new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(
                  new Date(product.updatedAt),
                )}
              </TableCell>
              <TableCell>
                <ProductActions productId={product.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ProductThumbnail({ product }: { product: Product }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-secondary p-1">
      {product.imageUrl && failedUrl !== product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="h-full w-full object-contain"
          onError={() => setFailedUrl(product.imageUrl ?? null)}
        />
      ) : (
        <Package
          role="img"
          aria-label={product.imageUrl ? 'Imagen no disponible' : 'Sin imagen'}
          className="size-5 text-muted-foreground"
        />
      )}
    </div>
  );
}
