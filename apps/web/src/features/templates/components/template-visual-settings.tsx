import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function TemplateVisualSettings() {
  return (
    <fieldset disabled className="space-y-3 border-t pt-5">
      <legend className="text-sm font-medium">Elementos visibles · Próximamente</legend>
      <p className="text-xs text-muted-foreground">
        La personalización de estos elementos todavía no se guarda.
      </p>
      {[
        'Logo',
        'Precio regular',
        'Precio promocional',
        'Titular',
        'Llamada a la acción',
        'Imagen principal',
      ].map((label, index) => (
        <div key={label} className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <Label htmlFor={'template-visual-' + index}>{label}</Label>
          <Switch id={'template-visual-' + index} disabled checked />
        </div>
      ))}
    </fieldset>
  );
}
