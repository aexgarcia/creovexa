'use client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { templateService } from '../services/template.service';
import type { BaseTemplate } from '../types/template-design';

const FORMAT_LABEL = { SQUARE: 'Cuadrado', PORTRAIT: 'Vertical', STORY: 'Historia' } as const;

/**
 * Plantillas base del sistema. Elegir una carga su diseño en el formulario; al guardar, la
 * empresa tiene su propia copia y puede ajustarla.
 */
export function BaseTemplatePicker({ onChoose }: { onChoose: (base: BaseTemplate) => void }) {
  const query = useQuery({
    queryKey: ['templates', 'base'],
    queryFn: ({ signal }) => templateService.findBase(signal),
    retry: false,
    staleTime: Infinity,
  });
  if (query.isLoading) return <p role="status">Cargando plantillas base…</p>;
  if (query.error || !query.data) return null;
  return (
    <section className="space-y-3 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Empezar desde una plantilla base</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Usan los colores de tu marca. Elige una y ajústala abajo antes de guardar.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {query.data.map((base) => (
          <div key={base.key} className="flex flex-col gap-2 rounded-lg border p-4">
            <p className="font-medium">{base.name}</p>
            <p className="flex-1 text-xs text-muted-foreground">{base.intendedFor}</p>
            <p className="text-xs text-muted-foreground">{FORMAT_LABEL[base.design.format]}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => onChoose(base)}>
              Usar esta
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
