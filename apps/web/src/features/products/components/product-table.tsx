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
    <div className="overflow-x-auto rounded-xl border">
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
                <p className="font-medium">{product.name}</p>
                <p className="max-w-md truncate text-xs text-muted-foreground">
                  {product.description}
                </p>
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
