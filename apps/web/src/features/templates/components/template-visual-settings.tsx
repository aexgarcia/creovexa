import { Palette, Layers } from 'lucide-react';
import { FormSection } from '@/components/layout/form-section';
import { ChoiceGroup, type ChoiceOption } from '@/components/ui/choice-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FORMAT_SIZES, type TemplateDesign, type TemplateElements } from '../types/template-design';
import { FORMAT_LABELS, COMPOSITION_LABELS, STYLE_LABELS } from '../types/template-design-options';
import { TemplateCompositionSymbol } from './template-composition-symbol';

type ChoiceField = Exclude<
  keyof TemplateDesign,
  'elements' | 'instructions' | 'styleReferenceAssetIds'
>;
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

export function TemplateVisualSettings({
  design,
  onChange,
  disabled = false,
}: {
  design: TemplateDesign;
  onChange: (design: TemplateDesign) => void;
  disabled?: boolean;
}) {
  const choose = <K extends ChoiceField>(
    field: K,
    label: string,
    options: ChoiceOption<TemplateDesign[K]>[],
    className?: string,
  ) => (
    <ChoiceGroup
      label={label}
      value={design[field]}
      options={options}
      onValueChange={(value) => onChange({ ...design, [field]: value })}
      disabled={disabled}
      className={className}
    />
  );
  const setElement = (key: keyof TemplateElements, value: boolean | number) =>
    onChange({ ...design, elements: { ...design.elements, [key]: value } });
  return (
    <>
      <FormSection
        title="Dirección de arte"
        description="La IA diseña el flyer con estas indicaciones y los colores de tu marca."
        icon={Palette}
      >
        {choose(
          'format',
          'Formato',
          (Object.keys(FORMAT_LABELS) as TemplateDesign['format'][]).map((value) => ({
            value,
            label: FORMAT_LABELS[value],
            description: `${FORMAT_SIZES[value].width} × ${FORMAT_SIZES[value].height}`,
            visual: (
              <span aria-hidden="true" className="grid h-11 place-items-center">
                <span
                  className="block border-2 border-current/60 bg-current/5"
                  style={{
                    width: value === 'STORY' ? 22 : value === 'PORTRAIT' ? 30 : 34,
                    height: value === 'STORY' ? 40 : value === 'PORTRAIT' ? 38 : 34,
                  }}
                />
              </span>
            ),
          })),
          'grid grid-cols-1 sm:grid-cols-3 [&>label]:flex-col [&>label]:py-3',
        )}
        {choose(
          'composition',
          'Composición',
          (Object.keys(COMPOSITION_LABELS) as TemplateDesign['composition'][]).map((value) => ({
            value,
            label: COMPOSITION_LABELS[value],
            visual: <TemplateCompositionSymbol composition={value} />,
          })),
          'grid grid-cols-2 sm:grid-cols-3 [&>label]:flex-col [&>label]:py-3',
        )}
        {choose(
          'style',
          'Estilo',
          (Object.keys(STYLE_LABELS) as TemplateDesign['style'][]).map((value) => ({
            value,
            label: STYLE_LABELS[value],
          })),
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          {choose(
            'mode',
            'Modo',
            [
              { value: 'DARK', label: 'Oscuro' },
              { value: 'LIGHT', label: 'Claro' },
            ],
            'grid grid-cols-2',
          )}
          {choose(
            'textDensity',
            'Cantidad de texto',
            [
              { value: 'MINIMAL', label: 'Mínima' },
              { value: 'BALANCED', label: 'Equilibrada' },
            ],
            'grid grid-cols-2',
          )}
        </div>
        {choose(
          'background',
          'Fondo',
          [
            { value: 'BRAND_COLOR', label: 'Color de marca' },
            { value: 'GRADIENT', label: 'Degradado' },
            { value: 'SCENE', label: 'Escena' },
            { value: 'STUDIO', label: 'Estudio' },
          ],
          'grid grid-cols-2',
        )}
        {choose(
          'logoPosition',
          'Posición del logo',
          [
            { value: 'TOP_LEFT', label: 'Arriba a la izquierda' },
            { value: 'TOP_RIGHT', label: 'Arriba a la derecha' },
            { value: 'BOTTOM_LEFT', label: 'Abajo a la izquierda' },
            { value: 'BOTTOM_RIGHT', label: 'Abajo a la derecha' },
          ],
          'grid grid-cols-2',
        )}
        <div className="space-y-2">
          <Label htmlFor="template-instructions">
            Indicaciones fijas{' '}
            <span className="ml-auto text-xs font-normal text-muted-foreground">Opcional</span>
          </Label>
          <Textarea
            id="template-instructions"
            rows={3}
            maxLength={300}
            disabled={disabled}
            placeholder="Ej. fondo con textura de papel kraft; nada de rojo"
            value={design.instructions ?? ''}
            onChange={(event) => onChange({ ...design, instructions: event.target.value || null })}
            aria-describedby="template-instructions-help"
            className="rounded-[10px] bg-control px-3.5 py-3 text-sm md:text-sm dark:bg-control"
          />
          <p
            id="template-instructions-help"
            className="flex justify-between gap-3 text-xs text-muted-foreground"
          >
            <span>
              Valen para todos los flyers de esta plantilla. Orientan el diseño; no agregan textos.
            </span>
            <span className="shrink-0 font-mono">{design.instructions?.length ?? 0}/300</span>
          </p>
        </div>
      </FormSection>
      <FormSection
        title="Elementos del flyer"
        description="Marca lo que debe aparecer. Lo que no marques, no se muestra."
        icon={Layers}
      >
        <p className="text-xs text-muted-foreground">
          {ELEMENTS.filter(([key]) => design.elements[key]).length} de {ELEMENTS.length} elementos
          seleccionados
        </p>
        <div className="grid gap-x-5 sm:grid-cols-2">
          {ELEMENTS.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 border-b py-3 last:border-0"
            >
              <Label
                id={'template-element-label-' + key}
                htmlFor={'template-element-' + key}
                className="text-[13px] font-normal"
              >
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-element-keyAttributes">Características del producto</Label>
          <select
            id="template-element-keyAttributes"
            disabled={disabled}
            value={design.elements.keyAttributes}
            onChange={(event) => setElement('keyAttributes', Number(event.target.value))}
            className="h-11 w-full rounded-[10px] border border-input bg-control px-3 text-sm"
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? 'No mostrar' : `Mostrar hasta ${n}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Se toman de la ficha de cada producto, en el orden que las guardaste.
          </p>
        </div>
      </FormSection>
    </>
  );
}
