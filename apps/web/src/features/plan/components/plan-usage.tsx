'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePlan } from '../hooks/use-plan';
import { formatReset, usageLabels, type AiUsageKind, type UsageWindow } from '../types/plan.types';

function UsageBar({ label, window, note }: { label: string; window: UsageWindow; note?: string }) {
  const percent = Math.min(100, Math.round((window.used / Math.max(1, window.limit)) * 100));
  const full = window.used >= window.limit;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {window.used} de {window.limit}
          {note ? ` ${note}` : ''}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={window.limit}
        aria-valuenow={window.used}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={full ? 'h-full bg-destructive' : 'h-full bg-primary'}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Plan y uso del período, en la configuración de la empresa (ADR-0033).
export function PlanUsageSummary() {
  const plan = usePlan();
  if (plan.isPending)
    return (
      <div role="status" aria-label="Cargando el plan" className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (plan.error || !plan.data)
    return (
      <p role="alert" className="text-sm text-destructive">
        {plan.error?.message ?? 'No se pudo cargar el plan.'}
      </p>
    );
  const { plan: current, usage, resources, periodResetsAt } = plan.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl border bg-control p-4">
        <div>
          <p className="text-xs text-muted-foreground">Tu plan</p>
          <p className="text-lg font-semibold">{current.name}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          S/ {current.monthlyPrice} al mes · el uso se reinicia el {formatReset(periodResetsAt)}
        </p>
      </div>
      <div className="space-y-4">
        {(Object.keys(usageLabels) as AiUsageKind[]).map((kind) => (
          <div key={kind} className="space-y-2">
            <UsageBar label={usageLabels[kind]} window={usage[kind].month} note="este mes" />
            {usage[kind].day && (
              <p className="text-xs text-muted-foreground">
                Hoy: {usage[kind].day.used} de {usage[kind].day.limit}. Se reinicia a medianoche.
              </p>
            )}
          </div>
        ))}
      </div>
      <ul className="grid gap-2 text-[13px] sm:grid-cols-2">
        <li className="rounded-[10px] border px-3 py-2">
          Productos activos: {resources.PRODUCT.used}
          {resources.PRODUCT.limit === null ? ' (sin límite)' : ` de ${resources.PRODUCT.limit}`}
        </li>
        <li className="rounded-[10px] border px-3 py-2">
          Plantillas propias: {resources.TEMPLATE.used}
          {resources.TEMPLATE.limit === null ? ' (sin límite)' : ` de ${resources.TEMPLATE.limit}`}
        </li>
        <li className="rounded-[10px] border px-3 py-2">
          Calidad media del flyer:{' '}
          {current.imageQualities.includes('MEDIUM') ? 'incluida (cuenta como 3)' : 'no incluida'}
        </li>
        <li className="rounded-[10px] border px-3 py-2">
          Marcas: {current.brands} · Usuarios: {current.users}
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">
        Para cambiar de plan, escríbenos. Los archivados no cuentan para los límites de productos y
        plantillas.
      </p>
    </div>
  );
}
