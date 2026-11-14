'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

export function CampaignImage({
  url,
  alt,
  emptyLabel,
  variant = 'preview',
  onLoad,
  onError,
}: {
  url: string | null | undefined;
  alt: string;
  emptyLabel: string;
  variant?: 'preview' | 'thumbnail';
  onLoad?: () => void;
  onError?: () => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const thumbnail = variant === 'thumbnail';
  if (!url || failedUrl === url)
    return (
      <div
        className={
          thumbnail
            ? 'flex size-20 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted/20 sm:size-24'
            : 'flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground'
        }
        title={url ? 'No se pudo cargar la imagen.' : emptyLabel}
      >
        <ImageIcon aria-hidden className="size-8 text-primary/70" />
        <p className={thumbnail ? 'sr-only' : undefined}>
          {url ? 'No se pudo cargar la imagen.' : emptyLabel}
        </p>
      </div>
    );
  return (
    <div
      className={
        thumbnail
          ? 'size-20 shrink-0 overflow-hidden rounded-lg border bg-muted/20 p-1 sm:size-24'
          : 'overflow-hidden rounded-xl border bg-muted/20'
      }
    >
      <Image
        src={url}
        alt={alt}
        width={1080}
        height={1080}
        unoptimized
        className={
          thumbnail ? 'h-full w-full object-contain' : 'max-h-[640px] h-auto w-full object-contain'
        }
        onLoad={onLoad}
        onError={() => {
          setFailedUrl(url);
          onError?.();
        }}
      />
    </div>
  );
}
