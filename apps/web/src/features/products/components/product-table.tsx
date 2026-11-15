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
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Precio regular</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <ProductThumbnail product={product} />
                  <div className="min-w-0">
                    <p className="font-medium">{product.name}</p>
                    <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                      {product.description}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.kind === 'PRODUCT' ? 'Producto' : 'Servicio'}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: product.regularPrice.currency,
                }).format(product.regularPrice.amountMinor / 100)}
              </TableCell>
              <TableCell>
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
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/20 p-1 sm:size-14">
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
