'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Package,
  BriefcaseBusiness,
  Tag,
  AlignLeft,
  Coins,
  Check,
  Sparkles,
  ArrowLeft,
  Megaphone,
} from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TextListField } from '@/components/ui/text-list-field';
import { FormSection } from '@/components/layout/form-section';
import { PageHeader } from '@/components/layout/page-header';
import { productSchema, type ProductFormValues } from '../schemas/product.schema';
import { amountMinor, decimalPrice } from '../schemas/product-price';
import type { Product } from '../types/product.types';
import { ProductImageField } from './product-image-field';

const selectClass =
  'h-11 w-full rounded-[10px] border border-input bg-control px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';
const currencySymbols = { PEN: 'S/', USD: '$', EUR: '€' };
interface ProductFormProps {
  title: string;
  description: string;
  product?: Product;
  isSubmitting?: boolean;
  onSubmit: (values: ProductFormValues, image: File | null) => Promise<void>;
}
const splitLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

export function ProductForm({
  title,
  description,
  product,
  isSubmitting = false,
  onSubmit,
}: ProductFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting: saving },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      kind: product?.kind ?? 'PRODUCT',
      price: product ? decimalPrice(product.regularPrice.amountMinor) : '',
      currency: product?.regularPrice.currency ?? 'PEN',
      shortName: product?.shortName ?? '',
      productBrand: product?.productBrand ?? '',
      keyAttributes: product?.keyAttributes.join('\n') ?? '',
      unit: product?.unit ?? '',
      benefits: product?.benefits.join('\n') ?? '',
      idealFor: product?.idealFor ?? '',
      photoType: product?.image?.photoType ?? '',
    },
  });
  const preview = useWatch({ control });
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState('');
  const temporaryUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (temporaryUrl.current) URL.revokeObjectURL(temporaryUrl.current);
    },
    [],
  );
  function selectImage(file: File | undefined) {
    if (
      file &&
      (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 10 * 1024 * 1024 ||
        !file.size)
    ) {
      setImageError(
        file.size > 10 * 1024 * 1024
          ? 'La imagen supera el máximo de 10 MB.'
          : 'Selecciona una imagen PNG, JPEG o WebP válida.',
      );
      return;
    }
    setImageError('');
    clearErrors('photoType');
    if (temporaryUrl.current) URL.revokeObjectURL(temporaryUrl.current);
    temporaryUrl.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(temporaryUrl.current);
    setImage(file ?? null);
    setValue('photoType', file ? '' : (product?.image?.photoType ?? ''));
  }
  const disabled = isSubmitting || saving;
  const imageUrl = previewUrl ?? product?.imageUrl ?? null;
  const currency = preview.currency ?? 'PEN';
  const price = amountMinor(preview.price ?? '') ?? 0;
  const attributes = (preview.keyAttributes ?? '').split('\n').filter(Boolean);
  const submitLabel = disabled ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto';
  return (
    <form
      id="product-form"
      onSubmit={handleSubmit((values) => {
        if (image && !values.photoType) {
          setError('photoType', { message: 'Indica qué muestra la foto' });
          document.querySelector<HTMLInputElement>('input[name="photoType"]')?.focus();
          return;
        }
        return onSubmit(values, image);
      })}
      className="space-y-6"
    >
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Productos
      </Link>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/products" />}
              disabled={disabled}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={disabled}>
              <Check className="size-4" />
              {submitLabel}
            </Button>
          </div>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <fieldset disabled={disabled} className="min-w-0 space-y-5">
          <legend className="sr-only">Datos del producto o servicio</legend>
          <FormSection
            title="Información básica"
            description="Cómo se llama y cómo aparecerá en el flyer."
            icon={Tag}
          >
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <fieldset disabled={Boolean(product)} className="space-y-2">
                  <legend className="mb-2 text-[13px] font-medium">Tipo</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: 'PRODUCT',
                          title: 'Producto',
                          help: 'Algo físico o digital que vendes',
                          icon: Package,
                        },
                        {
                          value: 'SERVICE',
                          title: 'Servicio',
                          help: 'Clases, consultas, talleres…',
                          icon: BriefcaseBusiness,
                        },
                      ] as const
                    ).map((option) => (
                      <label
                        key={option.value}
                        className={[
                          'flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border p-3 has-focus-visible:ring-2 has-focus-visible:ring-ring',
                          field.value === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-input bg-control',
                        ].join(' ')}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={field.name}
                          value={option.value}
                          checked={field.value === option.value}
                          onChange={() => field.onChange(option.value)}
                          onBlur={field.onBlur}
                          ref={field.ref}
                        />
                        <option.icon
                          aria-hidden="true"
                          className="size-5 shrink-0 text-brand-cyan"
                        />
                        <span>
                          <span className="block text-[13px] font-medium">{option.title}</span>
                          <span className="text-xs text-muted-foreground">{option.help}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {product && (
                    <p className="text-xs text-muted-foreground">El tipo se conserva al editar.</p>
                  )}
                </fieldset>
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-brand-cyan">*</span>
              </Label>
              <Input
                id="name"
                maxLength={200}
                placeholder="Ej. Café BAO tostado medio 500 g"
                {...register('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby="name-error"
              />
              <FieldError id="name-error" message={errors.name?.message} />
            </div>
            <div className="grid gap-[18px] sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shortName">
                  Nombre para el flyer{' '}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Opcional
                  </span>
                </Label>
                <Input
                  id="shortName"
                  maxLength={40}
                  placeholder="Ej. Pack BAO Café 3 × 500 g"
                  {...register('shortName')}
                  aria-invalid={Boolean(errors.shortName)}
                  aria-describedby="shortName-help shortName-error"
                />
                <p
                  id="shortName-help"
                  className="flex justify-between gap-2 text-xs text-muted-foreground"
                >
                  <span>Si lo dejas vacío, se usa el nombre.</span>
                  <span className="shrink-0 font-mono">{preview.shortName?.length ?? 0}/40</span>
                </p>
                <FieldError id="shortName-error" message={errors.shortName?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productBrand">
                  Marca del producto{' '}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Opcional
                  </span>
                </Label>
                <Input
                  id="productBrand"
                  maxLength={80}
                  placeholder="Si vendes una marca de otra empresa"
                  {...register('productBrand')}
                  aria-invalid={Boolean(errors.productBrand)}
                  aria-describedby="productBrand-error"
                />
                <FieldError id="productBrand-error" message={errors.productBrand?.message} />
              </div>
            </div>
          </FormSection>
          <FormSection
            title="Descripción y características"
            description="El flyer solo muestra estas características, nunca inventa otras."
            icon={AlignLeft}
          >
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                rows={3}
                maxLength={5000}
                placeholder="Cuéntale a la IA qué hace especial a este producto."
                {...register('description')}
                aria-invalid={Boolean(errors.description)}
                aria-describedby="description-error"
                className="rounded-[10px] border-input bg-control px-3.5 py-3 text-sm md:text-sm dark:bg-control"
              />
              <FieldError id="description-error" message={errors.description?.message} />
            </div>
            <Controller
              control={control}
              name="keyAttributes"
              render={({ field }) => (
                <TextListField
                  id="attributes"
                  label="Características clave"
                  items={splitLines(field.value)}
                  onChange={(items) => field.onChange(items.join('\n'))}
                  max={5}
                  maxLength={60}
                  placeholder="Ej. 100 % arábica"
                  duplicateMessage="Esta característica ya está en la lista."
                  help="Pulsa Añadir para incluir cada una y ordénalas por importancia. Guardarlas aquí no hace que aparezcan todas: la plantilla elegida en la campaña decide cuántas mostrar, incluso ninguna."
                  error={errors.keyAttributes?.message}
                />
              )}
            />
          </FormSection>
          <FormSection
            title="Para vender"
            description="Opcional. Con estos datos el texto de tus publicaciones vende mucho mejor."
            icon={Megaphone}
          >
            <Controller
              control={control}
              name="benefits"
              render={({ field }) => (
                <TextListField
                  id="benefits"
                  label="Beneficios para el cliente"
                  items={splitLines(field.value)}
                  onChange={(items) => field.onChange(items.join('\n'))}
                  max={5}
                  maxLength={120}
                  placeholder="Ej. Despiertas sin acidez gracias al tostado medio"
                  duplicateMessage="Este beneficio ya está en la lista."
                  help="Lo que gana quien lo compra, no la especificación. La IA los usa tal cual, así que escribe solo lo que es cierto."
                  error={errors.benefits?.message}
                />
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="idealFor">
                Para quién es{' '}
                <span className="ml-auto text-xs font-normal text-muted-foreground">Opcional</span>
              </Label>
              <Textarea
                id="idealFor"
                rows={2}
                maxLength={200}
                placeholder="Ej. Quien prepara café en casa cada mañana y quiere uno de especialidad."
                {...register('idealFor')}
                aria-invalid={Boolean(errors.idealFor)}
                aria-describedby="idealFor-error"
                className="rounded-[10px] border-input bg-control px-3.5 py-3 text-sm md:text-sm dark:bg-control"
              />
              <FieldError id="idealFor-error" message={errors.idealFor?.message} />
            </div>
          </FormSection>
          <FormSection
            title="Precio"
            description="Precio de lista. Las ofertas se configuran en cada campaña."
            icon={Coins}
          >
            <div className="grid gap-[18px] sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">
                  Precio regular <span className="text-brand-cyan">*</span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">
                    {currencySymbols[currency]}
                  </span>
                  <Input
                    id="price"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-10 font-mono"
                    {...register('price')}
                    aria-invalid={Boolean(errors.price)}
                    aria-describedby="price-error"
                  />
                </div>
                <FieldError id="price-error" message={errors.price?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <select id="currency" {...register('currency')} className={selectClass}>
                  <option value="PEN">PEN · Soles</option>
                  <option value="USD">USD · Dólares</option>
                  <option value="EUR">EUR · Euros</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">
                  Unidad{' '}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Opcional
                  </span>
                </Label>
                <Input
                  id="unit"
                  maxLength={30}
                  placeholder="por kg, por sesión, c/u"
                  {...register('unit')}
                  aria-invalid={Boolean(errors.unit)}
                  aria-describedby="unit-error"
                />
                <FieldError id="unit-error" message={errors.unit?.message} />
              </div>
            </div>
            <div className="flex gap-3 rounded-[10px] border border-primary/20 bg-primary/8 p-3 text-xs leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
              <p>
                <b className="font-medium text-foreground">¿Tienes una oferta?</b> Configúrala al
                crear la campaña. Así puedes reutilizar este producto con distintos descuentos y
                fechas.
              </p>
            </div>
          </FormSection>
        </fieldset>
        <aside
          aria-label="Imagen y vista previa"
          className="min-w-0 space-y-4 xl:sticky xl:top-[88px]"
        >
          <section className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-2 p-5">
              <h2 className="text-sm font-semibold">Imagen y vista previa</h2>
              <span className="rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {preview.kind === 'SERVICE' ? 'Servicio' : 'Producto'}
              </span>
            </div>
            <ProductImageField
              imageUrl={imageUrl}
              hasSelection={Boolean(image)}
              photoType={preview.photoType ?? ''}
              onPhotoTypeChange={(value) => {
                setValue('photoType', value, { shouldValidate: true });
              }}
              onSelect={selectImage}
              disabled={disabled}
              error={imageError}
              photoTypeError={errors.photoType?.message}
              legacyImage={Boolean(product?.image && !product.image.photoType)}
            />
            <div className="space-y-3 border-t bg-control/40 p-5">
              <h3 className="break-words text-lg font-semibold">
                {preview.shortName?.trim() || preview.name?.trim() || 'Nombre del producto'}
              </h3>
              <p className="whitespace-pre-wrap break-words text-[13px] text-muted-foreground">
                {preview.description || 'Agrega una descripción para tus campañas.'}
              </p>
              {attributes.length > 0 && (
                <ul aria-label="Vista previa de características" className="flex flex-wrap gap-1.5">
                  {attributes.map((attribute, index) => (
                    <li
                      key={index}
                      className="max-w-full break-words rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {attribute}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-baseline gap-2 pt-1">
                <b className="font-mono text-2xl font-medium">
                  {currencySymbols[currency]} {decimalPrice(price)}
                </b>
                <span className="break-words text-xs text-muted-foreground">{preview.unit}</span>
              </div>
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-[13px] font-semibold">Para mejores flyers</h2>
            <ul className="mt-3 space-y-3">
              {[
                'Usa una foto con el producto centrado y buena luz.',
                'Un nombre corto para el flyer se lee mejor en historias.',
                'Tres características bastan para la mayoría de plantillas.',
              ].map((tip) => (
                <li key={tip} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand-cyan" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur xl:static xl:border-0">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/products" />}
          disabled={disabled}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          <Check className="size-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
