import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { TemplateDesign } from '../types/template-design';

const elements = [
  ['showLogo', 'Logo'],
  ['showRegularPrice', 'Precio regular'],
  ['showPromotionPrice', 'Precio promocional'],
  ['showHeadline', 'Titular'],
  ['showCta', 'Llamada a la acción'],
  ['showMainImage', 'Imagen principal'],
] as const;

export function TemplateVisualSettings({
  design,
  onChange,
  disabled = false,
}: {
  design: TemplateDesign;
  onChange: (design: TemplateDesign) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4 border-t pt-5">
      <legend className="text-sm font-medium">Diseño de la publicidad</legend>
      <div className="space-y-2">
        <Label htmlFor="template-layout">Composición</Label>
        <select
          id="template-layout"
          value={design.layout}
          onChange={(e) =>
            onChange({ ...design, layout: e.target.value as TemplateDesign['layout'] })
          }
          className="w-full rounded-lg border bg-background p-2.5 text-sm"
        >
          <option value="CLASSIC">Clásica</option>
          <option value="PRODUCT_FOCUS">Producto destacado</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {design.layout === 'CLASSIC'
            ? 'La imagen ocupa el fondo y los datos comerciales se superponen.'
            : 'La imagen se enmarca entre el titular y los datos comerciales.'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-palette">Paleta de colores</Label>
        <select
          id="template-palette"
          value={design.palette}
          onChange={(e) =>
            onChange({ ...design, palette: e.target.value as TemplateDesign['palette'] })
          }
          className="w-full rounded-lg border bg-background p-2.5 text-sm"
        >
          <option value="BLUE">Azul</option>
          <option value="CORAL">Coral</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground">
        Elige los elementos que aparecerán en la pieza. El nombre del producto y las fechas de
        promoción se conservan.
      </p>
      {elements.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <Label id={'template-visual-label-' + key} htmlFor={'template-visual-' + key}>
            {label}
          </Label>
          <Switch
            aria-labelledby={'template-visual-label-' + key}
            id={'template-visual-' + key}
            disabled={disabled}
            checked={design.settings[key]}
            onCheckedChange={(checked) =>
              onChange({ ...design, settings: { ...design.settings, [key]: checked } })
            }
          />
        </div>
      ))}
    </fieldset>
  );
}
