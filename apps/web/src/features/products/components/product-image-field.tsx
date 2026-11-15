'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PhotoType } from '../types/product.types';

const PHOTO_TYPES: { value: PhotoType; label: string; help: string }[] = [
  {
    value: 'CUTOUT',
    label: 'Recortada',
    help: 'Producto sin fondo. La IA lo coloca sobre el diseño.',
  },
  { value: 'STUDIO', label: 'Estudio', help: 'Producto sobre un fondo liso.' },
  {
    value: 'SCENE',
    label: 'Ambiente',
    help: 'Producto en un ambiente. La IA puede recomponer el fondo.',
  },
  { value: 'PLACE', label: 'Lugar', help: 'Tu local o espacio, ideal para servicios.' },
  { value: 'PERSON', label: 'Persona', help: 'La foto contiene una o varias personas.' },
];

export function ProductImageField({
  imageUrl,
  hasSelection,
  photoType,
  onPhotoTypeChange,
  onSelect,
  disabled,
  error,
  photoTypeError,
  legacyImage,
}: {
  imageUrl: string | null;
  hasSelection: boolean;
  photoType: PhotoType | '';
  onPhotoTypeChange: (value: PhotoType) => void;
  onSelect: (file: File | undefined) => void;
  disabled: boolean;
  error: string;
  photoTypeError?: string;
  legacyImage: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div className="space-y-4 px-5 pb-5">
      <input
        ref={fileInput}
        id="product-image"
        type="file"
        hidden
        tabIndex={-1}
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={imageUrl ? 'Cambiar imagen del producto' : 'Subir imagen del producto'}
        aria-describedby="product-image-help product-image-error"
        onClick={() => fileInput.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled && event.dataTransfer.files[0]) onSelect(event.dataTransfer.files[0]);
        }}
        className={`group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed bg-control p-4 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${dragging ? 'border-primary bg-primary/10' : 'border-input hover:border-primary'}`}
      >
        {imageUrl && failedUrl !== imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt="Imagen del producto"
              width={1080}
              height={1080}
              unoptimized
              className="size-full object-contain"
              onError={() => setFailedUrl(imageUrl)}
            />
            <span className="absolute right-3 bottom-3 rounded-lg border bg-card px-3 py-1.5 text-xs">
              Cambiar imagen
            </span>
          </>
        ) : (
          <>
            <span className="mb-3 grid size-12 place-items-center rounded-xl border border-input bg-card text-brand-cyan">
              {imageUrl ? <ImageIcon className="size-6" /> : <Upload className="size-6" />}
            </span>
            <span className="text-sm font-medium">
              {imageUrl
                ? 'Imagen no disponible. Haz clic para reemplazarla.'
                : 'Arrastra tu foto o haz clic'}
            </span>
            <span className="mt-2 text-xs leading-relaxed text-muted-foreground">
              PNG, JPEG o WebP · máx. 10 MB
              <br />
              Ideal: producto centrado y buena luz
            </span>
          </>
        )}
      </button>
      <p id="product-image-help" className="text-xs text-muted-foreground">
        La imagen se guarda al confirmar el formulario.
      </p>
      {hasSelection && (
        <>
          <fieldset disabled={disabled} className="space-y-2">
            <legend className="mb-2 text-[13px] font-medium">
              ¿Qué muestra la foto? <span className="text-brand-cyan">*</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {PHOTO_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs has-focus-visible:ring-2 has-focus-visible:ring-ring ${photoType === type.value ? 'border-primary bg-primary/15 text-foreground' : 'border-input bg-control text-muted-foreground'}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="photoType"
                    value={type.value}
                    checked={photoType === type.value}
                    aria-describedby="photo-type-help photo-type-error"
                    onChange={() => onPhotoTypeChange(type.value)}
                  />
                  {type.label}
                </label>
              ))}
            </div>
            <p id="photo-type-help" className="text-xs text-muted-foreground">
              {PHOTO_TYPES.find((type) => type.value === photoType)?.help ??
                'Elige una opción para ayudar a la IA a saber qué conservar.'}
            </p>
            {photoTypeError && (
              <p id="photo-type-error" role="alert" className="text-xs text-destructive">
                {photoTypeError}
              </p>
            )}
          </fieldset>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(undefined)}
          >
            Descartar selección
          </Button>
        </>
      )}
      {legacyImage && !hasSelection && (
        <p className="text-xs text-muted-foreground">
          Esta imagen se subió sin indicar qué muestra. Vuelve a subirla para mejorar el flyer.
        </p>
      )}
      {error && (
        <p id="product-image-error" role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
