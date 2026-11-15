import { ImageIcon } from 'lucide-react';
import { FORMAT_SIZES, defaultTemplateDesign, type TemplateDesign } from '../types/template-design';

const CORNER: Record<TemplateDesign['logoPosition'], string> = {
  TOP_LEFT: 'left-[5%] top-[4%]',
  TOP_RIGHT: 'right-[5%] top-[4%]',
  BOTTOM_LEFT: 'bottom-[4%] left-[5%]',
  BOTTOM_RIGHT: 'bottom-[4%] right-[5%]',
};

/**
 * Solo una muestra visual; no es un archivo de campaña guardado ni compuesto. Es un esquema:
 * con IA, cada flyer se diseña distinto, así que muestra el formato, el modo, dónde va el
 * logo y qué textos lleva, no el diseño final.
 */
export function TemplateDesignPreview({
  design = defaultTemplateDesign(),
}: {
  design?: TemplateDesign;
}) {
  const { width, height } = FORMAT_SIZES[design.format];
  const dark = design.mode === 'DARK';
  const e = design.elements;
  const texts = [
    e.headline && ['Titular', 'text-[5cqw] font-extrabold'],
    e.subheadline && ['Subtítulo', 'text-[3cqw]'],
    e.productName && ['Nombre del producto', 'text-[3cqw] font-semibold'],
    e.keyAttributes > 0 && [`${e.keyAttributes} características`, 'text-[2.4cqw]'],
    e.regularPrice && [e.promotionPrice ? 'Precio regular' : 'Precio', 'text-[3cqw]'],
    e.promotionPrice && ['Precio de oferta', 'text-[5cqw] font-extrabold'],
    e.validity && ['Fechas de la promoción', 'text-[2.2cqw]'],
    e.cta && ['Llamada a la acción', 'text-[2.6cqw] font-bold'],
    e.contact && ['Contacto', 'text-[2.2cqw]'],
    e.legalText && ['Texto legal', 'text-[1.8cqw] opacity-70'],
  ].filter(Boolean) as [string, string][];
  return (
    <div className="space-y-3">
      <div
        data-format={design.format}
        data-mode={design.mode}
        className={`relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border shadow-sm ${
          dark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'
        }`}
        style={{ aspectRatio: `${width} / ${height}`, containerType: 'inline-size' }}
      >
        {design.composition !== 'TYPOGRAPHIC' && (
          <div
            className={`absolute flex items-center justify-center rounded-xl border border-dashed ${
              dark ? 'border-white/20' : 'border-slate-300'
            } ${design.composition === 'SPLIT' ? 'inset-y-[18%] left-[5%] w-[42%]' : 'inset-x-[15%] top-[30%] h-[35%]'}`}
          >
            <ImageIcon aria-label="Foto del producto" className="size-10 opacity-40" />
          </div>
        )}
        {e.logo && (
          <div
            className={`absolute ${CORNER[design.logoPosition]} rounded-md border border-dashed px-2 py-1 text-[2.4cqw] ${
              dark ? 'border-white/40' : 'border-slate-400'
            }`}
          >
            Logo
          </div>
        )}
        <ul
          className={`absolute bottom-[12%] space-y-[1.2cqw] ${
            design.composition === 'SPLIT' ? 'left-[52%] right-[5%]' : 'left-[8%] right-[8%]'
          }`}
        >
          {texts.map(([label, style]) => (
            <li key={label} className={`leading-tight ${style}`}>
              {label}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Esquema orientativo: la IA diseña cada flyer con estas indicaciones, la foto y los colores
        de tu marca.
      </p>
    </div>
  );
}
