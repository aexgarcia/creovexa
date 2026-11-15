'use client';
import { Sparkles, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/layout/form-section';
import { templateService } from '../services/template.service';
import type { BaseTemplate } from '../types/template-design';
import { FORMAT_LABELS } from '../types/template-design-options';
import { TemplateCompositionSymbol } from './template-composition-symbol';

export function BaseTemplatePicker({
  onChoose,
  disabled = false,
  selectedKey = null,
}: {
  onChoose: (base: BaseTemplate) => void;
  disabled?: boolean;
  selectedKey?: string | null;
}) {
  const query = useQuery({
    queryKey: ['templates', 'base'],
    queryFn: ({ signal }) => templateService.findBase(signal),
    retry: false,
    staleTime: Infinity,
  });
  return (
    <FormSection
      title="Empieza desde una base"
      description="Usan los colores de tu marca. Elige una y ajústala abajo."
      icon={Sparkles}
    >
      {query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando plantillas base…
        </p>
      ) : query.error ? (
        <div role="alert" className="space-y-2 text-sm">
          <p>No se pudieron cargar las bases. Puedes continuar definiendo tu propia plantilla.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetching || disabled}
            onClick={() => void query.refetch()}
          >
            Reintentar bases
          </Button>
        </div>
      ) : !query.data?.length ? (
        <p className="text-sm text-muted-foreground">
          No hay bases disponibles. Puedes definir la tuya abajo.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {query.data.map((base) => (
            <button
              type="button"
              key={base.key}
              disabled={disabled}
              aria-pressed={selectedKey === base.key}
              onClick={() => onChoose(base)}
              className={`relative flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selectedKey === base.key ? 'border-primary bg-primary/10' : 'border-input bg-control hover:border-primary/50'}`}
            >
              <span className="mt-0.5 shrink-0 text-brand-cyan">
                <TemplateCompositionSymbol composition={base.design.composition} />
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block text-[13px] font-medium">{base.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {FORMAT_LABELS[base.design.format]}
                </span>
                <span className="block text-[11px] leading-relaxed text-muted-foreground">
                  {base.intendedFor}
                </span>
              </span>
              {selectedKey === base.key && (
                <Check
                  aria-hidden="true"
                  className="absolute top-1 right-1 size-3 text-brand-cyan"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </FormSection>
  );
}
