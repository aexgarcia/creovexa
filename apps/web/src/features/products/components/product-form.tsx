'use client';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { productSchema, type ProductFormValues } from '../schemas/product.schema';
import { decimalPrice } from '../schemas/product-price';
import type { Product } from '../types/product.types';

interface ProductFormProps {
  product?: Product;
  isSubmitting?: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}
export function ProductForm({ product, isSubmitting = false, onSubmit }: ProductFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: saving },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      kind: product?.kind ?? 'PRODUCT',
      price: product ? decimalPrice(product.regularPrice.amountMinor) : '',
      currency: product?.regularPrice.currency ?? 'PEN',
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <fieldset
        disabled={isSubmitting || saving}
        className="space-y-6 rounded-xl border bg-card p-6"
      >
        <legend className="px-2 font-semibold">Información del producto o servicio</legend>
        <div className="space-y-2">
          <Label htmlFor="kind">Tipo</Label>
          <select
            id="kind"
            {...register('kind')}
            aria-readonly={Boolean(product)}
            className="w-full rounded border bg-background p-2"
            onChange={product ? () => {} : register('kind').onChange}
          >
            <option value="PRODUCT" disabled={product?.kind === 'SERVICE'}>
              Producto
            </option>
            <option value="SERVICE" disabled={product?.kind === 'PRODUCT'}>
              Servicio
            </option>
          </select>
          {product && (
            <p className="text-xs text-muted-foreground">El tipo se conserva al editar.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            maxLength={200}
            {...register('name')}
            aria-invalid={Boolean(errors.name)}
            aria-describedby="name-error"
          />
          <p id="name-error" role="alert" className="text-sm text-destructive">
            {errors.name?.message}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            rows={5}
            maxLength={5000}
            {...register('description')}
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && (
            <p role="alert" className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">Precio regular</Label>
            <Input
              id="price"
              inputMode="decimal"
              placeholder="0.00"
              {...register('price')}
              aria-invalid={Boolean(errors.price)}
              aria-describedby="price-error"
            />
            <p id="price-error" role="alert" className="text-sm text-destructive">
              {errors.price?.message}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <select
              id="currency"
              {...register('currency')}
              className="w-full rounded border bg-background p-2"
            >
              <option value="PEN">PEN — Soles</option>
              <option value="USD">USD — Dólares</option>
              <option value="EUR">EUR — Euros</option>
            </select>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Las ofertas se configuran en cada campaña. La carga de imágenes estará disponible más
          adelante.
        </p>
      </fieldset>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting || saving}
          onClick={() => router.push('/products')}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || saving}>
          {isSubmitting || saving ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  );
}
