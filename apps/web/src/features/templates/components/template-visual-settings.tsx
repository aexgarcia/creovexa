import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { TemplateDesign, TemplateElements } from '../types/template-design';

type Options<K extends keyof TemplateDesign> = [TemplateDesign[K], string][];

const FORMATS: Options<'format'> = [
  ['SQUARE', 'Cuadrado · 1080 × 1080 (publicación)'],
  ['PORTRAIT', 'Vertical · 1080 × 1350 (publicación)'],
  ['STORY', 'Historia · 1080 × 1920'],
];
const COMPOSITIONS: Options<'composition'> = [
  ['PRODUCT_HERO', 'Producto protagonista'],
  ['PRODUCT_PANEL', 'Producto en panel'],
  ['SCENE', 'Escena ambientada'],
  ['SPLIT', 'Dividida: foto y textos'],
  ['TYPOGRAPHIC', 'Tipográfica, sin foto'],
];
const STYLES: Options<'style'> = [
  ['MINIMALIST', 'Minimalista'],
  ['BOLD', 'Audaz'],
  ['ELEGANT', 'Elegante'],
  ['PLAYFUL', 'Divertido'],
  ['CORPORATE', 'Corporativo'],
  ['NATURAL', 'Natural'],
];
const MODES: Options<'mode'> = [
  ['DARK', 'Oscuro'],
  ['LIGHT', 'Claro'],
];
const BACKGROUNDS: Options<'background'> = [
  ['BRAND_COLOR', 'Color de marca'],
  ['GRADIENT', 'Degradado'],
  ['SCENE', 'Escena'],
  ['STUDIO', 'Estudio'],
];
const LOGO_POSITIONS: Options<'logoPosition'> = [
  ['TOP_LEFT', 'Arriba a la izquierda'],
  ['TOP_RIGHT', 'Arriba a la derecha'],
  ['BOTTOM_LEFT', 'Abajo a la izquierda'],
  ['BOTTOM_RIGHT', 'Abajo a la derecha'],
];
const DENSITIES: Options<'textDensity'> = [
  ['MINIMAL', 'Mínima: pocos textos, más aire'],
  ['BALANCED', 'Equilibrada'],
];

const ELEMENTS: [Exclude<keyof TemplateElements, 'keyAttributes'>, string][] = [
  ['logo', 'Logo'],
  ['headline', 'Titular'],
  ['subheadline', 'Subtítulo'],
  ['productName', 'Nombre del producto'],
  ['regularPrice', 'Precio regular'],
  ['promotionPrice', 'Precio promocional'],
  ['validity', 'Fechas de la promoción'],
  ['cta', 'Llamada a la acción'],
  ['contact', 'Contacto'],
  ['legalText', 'Texto legal'],
];

const selectClass = 'w-full rounded-lg border bg-background p-2.5 text-sm';

function Choice<K extends keyof TemplateDesign>({
  field,
  label,
  options,
  design,
  onChange,
}: {
  field: K;
  label: string;
  options: Options<K>;
  design: TemplateDesign;
  onChange: (design: TemplateDesign) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`template-${field}`}>{label}</Label>
      <select
        id={`template-${field}`}
        value={design[field] as string}
        onChange={(e) => onChange({ ...design, [field]: e.target.value })}
        className={selectClass}
      >
        {options.map(([value, text]) => (
          <option key={value as string} value={value as string}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TemplateVisualSettings({
  design,
  onChange,
  disabled = false,
}: {
  design: TemplateDesign;
  onChange: (design: TemplateDesign) => void;
  disabled?: boolean;
}) {
  const props = { design, onChange };
  const setElement = (key: keyof TemplateElements, value: boolean | number) =>
    onChange({ ...design, elements: { ...design.elements, [key]: value } });
  return (
    <fieldset disabled={disabled} className="space-y-4 border-t pt-5">
      <legend className="text-sm font-medium">Dirección de arte</legend>
      <p className="text-xs text-muted-foreground">
        La IA diseña el flyer con estas indicaciones y los colores de tu marca.
      </p>
      <Choice field="format" label="Formato" options={FORMATS} {...props} />
      <Choice field="composition" label="Composición" options={COMPOSITIONS} {...props} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice field="style" label="Estilo" options={STYLES} {...props} />
        <Choice field="mode" label="Modo" options={MODES} {...props} />
        <Choice field="background" label="Fondo" options={BACKGROUNDS} {...props} />
        <Choice field="textDensity" label="Cantidad de texto" options={DENSITIES} {...props} />
      </div>
      <Choice field="logoPosition" label="Posición del logo" options={LOGO_POSITIONS} {...props} />
      <p className="pt-2 text-sm font-medium">Elementos del flyer</p>
      {ELEMENTS.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <Label id={'template-element-label-' + key} htmlFor={'template-element-' + key}>
            {label}
          </Label>
          <Switch
            aria-labelledby={'template-element-label-' + key}
            id={'template-element-' + key}
            disabled={disabled}
            checked={design.elements[key]}
            onCheckedChange={(checked) => setElement(key, checked)}
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="template-element-keyAttributes">Características del producto</Label>
        <select
          id="template-element-keyAttributes"
          value={design.elements.keyAttributes}
          onChange={(e) => setElement('keyAttributes', Number(e.target.value))}
          className={selectClass}
        >
          {[0, 1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? 'No mostrar' : `Mostrar hasta ${n}`}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
