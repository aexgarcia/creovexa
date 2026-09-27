'use client';

import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { useProduct } from '@/features/products/hooks/use-product';

import { zodResolver } from '@hookform/resolvers/zod';

import { Loader2, Megaphone, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useProducts } from '@/features/products/hooks/use-products';
import { useTemplate } from '@/features/templates/hooks/use-template';
import { useTemplates } from '@/features/templates/hooks/use-templates';

import { campaignSchema, type CampaignFormValues } from '../schemas/campaign.schema';

interface CampaignFormProps {
  defaultValues?: CampaignFormValues;

  onSubmit: (values: CampaignFormValues) => Promise<void>;

  isSubmitting?: boolean;

  submitLabel?: string;
}

export function CampaignForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Crear campaña',
}: CampaignFormProps) {
  const [productPage, setProductPage] = useState(1);
  const {
    data: products,
    meta: productMeta,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts(productPage);

  const [templatePage, setTemplatePage] = useState(1);
  const {
    data: templates,
    meta: templateMeta,
    error: templatesError,
    isLoading: templatesLoading,
  } = useTemplates(templatePage);

  const {
    register,
    control,
    handleSubmit,
    watch,

    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),

    defaultValues: defaultValues ?? {
      name: '',
      productId: '',
      templateId: '',
      promotionStart: '',
      promotionEnd: '',
      additionalInstructions: '',
    },
  });

  const productId = watch('productId');

  const templateId = watch('templateId');

  const { data: selectedProduct } = useProduct(productId);

  const { data: selectedTemplate } = useTemplate(templateId);

  if (productsLoading || templatesLoading) {
    return (
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <Skeleton className="h-[600px]" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold">Información de campaña</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Define el producto, plantilla y datos promocionales.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre de campaña</Label>

            <Input id="name" placeholder="Ej. Promo Primavera" {...register('name')} />

            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <Controller
            control={control}
            name="productId"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Producto</Label>

                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue>{selectedProduct?.name ?? 'Seleccionar producto'}</SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={productPage === 1 || productsLoading}
                    onClick={() => setProductPage((p) => p - 1)}
                  >
                    Anteriores
                  </Button>
                  <span>Página {productPage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !productMeta || productPage >= productMeta.totalPages || productsLoading
                    }
                    onClick={() => setProductPage((p) => p + 1)}
                  >
                    Más productos
                  </Button>
                </div>
                {productsError && (
                  <p role="alert" className="text-sm text-destructive">
                    {productsError.message}
                  </p>
                )}
                {errors.productId && (
                  <p className="text-sm text-destructive">{errors.productId.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="templateId"
            render={({ field }) => (
              <div className="space-y-2">
                <Label>Plantilla</Label>

                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue>{selectedTemplate?.name ?? 'Seleccionar plantilla'}</SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    {templates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={templatePage === 1 || templatesLoading}
                    onClick={() => setTemplatePage((p) => p - 1)}
                  >
                    Anteriores
                  </Button>
                  <span>Página {templatePage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !templateMeta || templatePage >= templateMeta.totalPages || templatesLoading
                    }
                    onClick={() => setTemplatePage((p) => p + 1)}
                  >
                    Más plantillas
                  </Button>
                </div>
                {templatesError && (
                  <p role="alert" className="text-sm text-destructive">
                    {templatesError.message}
                  </p>
                )}
                {errors.templateId && (
                  <p className="text-sm text-destructive">{errors.templateId.message}</p>
                )}
              </div>
            )}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promotionStart">Inicio de promoción</Label>

              <Input id="promotionStart" type="date" {...register('promotionStart')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotionEnd">Fin de promoción</Label>

              <Input id="promotionEnd" type="date" {...register('promotionEnd')} />

              {errors.promotionEnd && (
                <p className="text-sm text-destructive">{errors.promotionEnd.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInstructions">Instrucciones adicionales</Label>

            <Textarea
              id="additionalInstructions"
              rows={5}
              placeholder="Ej. Utilizar un tono juvenil, resaltar el descuento..."
              {...register('additionalInstructions')}
            />

            <p className="text-xs text-muted-foreground">
              Estas instrucciones podrán utilizarse posteriormente durante la generación del
              contenido.
            </p>

            {errors.additionalInstructions && (
              <p className="text-sm text-destructive">{errors.additionalInstructions.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
                <Megaphone className="size-5 text-primary" />
              </div>

              <div>
                <h2 className="font-semibold">Resumen</h2>

                <p className="text-xs text-muted-foreground">Configuración actual</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs text-muted-foreground">Producto</p>

                <p className="mt-1 text-sm font-medium">
                  {selectedProduct?.name ?? 'Sin seleccionar'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Plantilla</p>

                <p className="mt-1 text-sm font-medium">
                  {selectedTemplate?.name ?? 'Sin seleccionar'}
                </p>
              </div>

              {selectedProduct && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Precio regular</p>

                    <p className="mt-1 text-sm font-medium">
                      {new Intl.NumberFormat('es-PE', {
                        style: 'currency',
                        currency: selectedProduct.regularPrice.currency,
                      }).format(selectedProduct.regularPrice.amountMinor / 100)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Precio promocional</p>

                    <p className="mt-1 text-sm font-medium text-emerald-500">
                      Se define en la campaña
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-5">
            <p className="text-sm font-medium">Estado inicial</p>

            <p className="mt-1 text-sm text-muted-foreground">
              La campaña se guardará inicialmente como
              <span className="ml-1 font-medium text-foreground">Borrador</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
