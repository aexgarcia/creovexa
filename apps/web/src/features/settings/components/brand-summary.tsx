'use client';

import Image from 'next/image';
import { Building2, Info } from 'lucide-react';
import { useState } from 'react';
import { CompletionRing } from '@/components/ui/completion-ring';
import type { BrandColors, Typography } from '../services/company-settings.service';
import type { BrandVoiceDraft } from './brand-voice-fields';
import { splitWords } from './brand-voice-fields';

export function BrandSummary({
  name,
  industry,
  tone,
  logoUrl,
  colors,
  voice,
  hasLogo,
  pendingLogo,
}: {
  name: string;
  industry: string;
  tone: string;
  logoUrl: string | null;
  colors: BrandColors | null;
  voice: BrandVoiceDraft;
  hasLogo: boolean;
  pendingLogo: boolean;
}) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const checks = [
    { title: 'logo', ok: hasLogo },
    { title: 'colores', ok: Boolean(colors) },
    { title: 'rubro y tono', ok: Boolean(industry.trim() && tone.trim()) },
    { title: 'contacto', ok: Object.values(voice.contact).some((value) => value?.trim()) },
    { title: 'texto legal', ok: Boolean(voice.defaultLegalText.trim()) },
  ];
  const complete = checks.filter((item) => item.ok).length;
  const typography: Record<Typography, string> = {
    SANS_MODERN: 'Sans moderna',
    SERIF_ELEGANT: 'Serif elegante',
    ROUNDED: 'Redondeada',
    CONDENSED_BOLD: 'Condensada audaz',
    HANDWRITTEN: 'Manuscrita',
  };
  const missing = checks.filter((item) => !item.ok).map((item) => item.title);
  return (
    <aside
      aria-label="Resumen del kit de marca"
      className="min-w-0 space-y-4 xl:sticky xl:top-[var(--settings-sticky-offset)]"
    >
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex min-h-44 flex-col items-center justify-center gap-6 bg-control p-6">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Así ve la IA tu marca
          </span>
          {logoUrl && failedLogo !== logoUrl ? (
            <Image
              src={logoUrl}
              alt={`Logo de ${name || 'tu empresa'}`}
              width={200}
              height={80}
              unoptimized
              loading="eager"
              className="h-20 max-w-full object-contain"
              onError={() => setFailedLogo(logoUrl)}
            />
          ) : (
            <Building2 className="size-12 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-5 p-5">
          <div>
            <h2 className="break-words text-xl font-semibold">{name.trim() || 'Tu empresa'}</h2>
            <p className="mt-1 break-words text-[13px] text-muted-foreground">
              {[industry, tone].filter(Boolean).join(' · ') || 'Define tu rubro y tono de marca'}
            </p>
          </div>
          {colors ? (
            <div
              className="flex h-6 overflow-hidden rounded-lg border"
              aria-label="Colores de marca"
            >
              {Object.entries(colors).map(([key, color]) => (
                <span
                  key={key}
                  className="flex-1"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin colores configurados</p>
          )}
          <dl className="space-y-4 text-[13px]">
            {[
              [
                'Tipografía',
                voice.typography ? typography[voice.typography] : 'Que la elija la IA',
              ],
              ['Estilo', splitWords(voice.visualStyle).join(', ') || 'Sin definir'],
              [
                'Contacto',
                Object.values(voice.contact).filter(Boolean).join(' · ') || 'Sin definir',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <section className="flex items-center gap-4 rounded-2xl border bg-card p-5">
        <CompletionRing
          value={(complete / checks.length) * 100}
          label="Campos del kit completados"
        />
        <div>
          <h2 className="text-[13px] font-semibold">Kit de marca</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {complete} de {checks.length} apartados completos.
            {missing.length ? ` Falta: ${missing.join(', ')}.` : ' Tu kit está completo.'}
          </p>
        </div>
      </section>
      <p className="flex gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {pendingLogo ? 'El logo seleccionado aún no está guardado. ' : ''}El resumen refleja lo que
        editas. El indicador cuenta campos completos; no mide la calidad del flyer.
      </p>
    </aside>
  );
}
