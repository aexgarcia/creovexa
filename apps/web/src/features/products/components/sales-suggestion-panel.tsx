'use client';

import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSalesSuggestionsAvailable, useSuggestSalesData } from '../hooks/use-sales-suggestions';
import { usePlan, useRefreshPlan } from '@/features/plan/hooks/use-plan';
import { formatReset, nextReset, remaining } from '@/features/plan/types/plan.types';
import type { SalesSuggestion, SalesSuggestionInput } from '../types/product.types';

// Botón «Sugerir con IA» de la sección «Para vender» (ADR-0031). La propuesta no se guarda: el
// usuario la usa, la edita después o la descarta.
export function SalesSuggestionPanel({
  input,
  onApply,
  disabled = false,
}: {
  // null mientras falte el nombre.
  input: SalesSuggestionInput | null;
  onApply: (suggestion: SalesSuggestion) => void;
  disabled?: boolean;
}) {
  const status = useSalesSuggestionsAvailable();
  const suggest = useSuggestSalesData();
  const plan = usePlan();
  const refreshPlan = useRefreshPlan();
  if (!status.data) return null;
  const suggestion = suggest.data;
  // Sin datos del plan no se bloquea: la API aplica el límite igual (ADR-0033).
  const left = plan.data ? remaining(plan.data, 'PRODUCT_SUGGESTION') : null;
  return (
    <div className="space-y-3 rounded-xl border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          ¿No sabes qué escribir? La IA propone beneficios a partir del nombre, la descripción y las
          características. Revísalos antes de guardar.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !input || suggest.isPending || left === 0}
          onClick={() => input && suggest.mutate(input, { onSettled: () => void refreshPlan() })}
        >
          <Sparkles className="size-4" />
          {suggest.isPending ? 'Pensando…' : suggestion ? 'Sugerir otra vez' : 'Sugerir con IA'}
        </Button>
      </div>
      {left !== null && (
        <p className="text-xs text-muted-foreground">
          {left > 0
            ? `Te quedan ${left} sugerencias este mes.`
            : `Usaste todas las sugerencias de tu plan. Vuelven el ${formatReset(nextReset(plan.data!, 'PRODUCT_SUGGESTION'))}.`}
        </p>
      )}
      {!input && (
        <p className="text-xs text-muted-foreground">Escribe primero el nombre del producto.</p>
      )}
      {suggest.error && (
        <p role="alert" className="text-xs text-destructive">
          {suggest.error.message}
        </p>
      )}
      {suggestion && !suggest.isPending && (
        <div className="space-y-3 rounded-[10px] border bg-control p-3" aria-live="polite">
          <div>
            <p className="text-[13px] font-medium">Beneficios sugeridos</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-[13px]">
              {suggestion.benefits.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ol>
          </div>
          {suggestion.idealFor && (
            <div>
              <p className="text-[13px] font-medium">Para quién es</p>
              <p className="mt-1 text-[13px]">{suggestion.idealFor}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Usarla reemplaza los beneficios y «para quién es» actuales. Corrige lo que no sea
            cierto.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(suggestion);
                suggest.reset();
              }}
            >
              <Check className="size-4" />
              Usar sugerencia
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => suggest.reset()}>
              <X className="size-4" />
              Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
