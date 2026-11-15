import { ImageIcon } from 'lucide-react';
import { FORMAT_SIZES, defaultTemplateDesign, type TemplateDesign } from '../types/template-design';

const CORNER: Record<TemplateDesign['logoPosition'], string> = {
  TOP_LEFT: 'left-[5%] top-[4%]',
  TOP_RIGHT: 'right-[5%] top-[4%]',
  BOTTOM_LEFT: 'bottom-[4%] left-[5%]',
  BOTTOM_RIGHT: 'bottom-[4%] right-[5%]',
};

// Esquema local con textos y colores de ejemplo; nunca representa el archivo final de una campaña.
export function TemplateDesignPreview({
  design = defaultTemplateDesign(),
  compact = false,
}: {
  design?: TemplateDesign;
  compact?: boolean;
}) {
  const { width, height } = FORMAT_SIZES[design.format];
  const dark = design.mode === 'DARK';
  const e = design.elements;
  const texts = [
    e.headline && ['Titular', 'text-[5cqw] font-bold tracking-tight'],
    e.subheadline && ['Subtítulo', 'text-[2.8cqw] opacity-75'],
    e.productName && ['Nombre del producto', 'text-[3cqw] font-medium'],
    e.keyAttributes > 0 && [`${e.keyAttributes} características`, 'text-[2.2cqw] opacity-70'],
    e.regularPrice && [
      'Precio regular',
      `text-[2.5cqw] ${e.promotionPrice ? 'line-through opacity-60' : 'font-medium'}`,
    ],
    e.promotionPrice && ['Precio de oferta', 'text-[4.5cqw] font-bold'],
    e.validity && ['Fechas de la promoción', 'text-[2cqw] opacity-70'],
    e.cta && [
      'Llamada a la acción',
      'w-fit rounded-full border border-current/25 px-[2cqw] py-[1cqw] text-[2.3cqw] font-semibold',
    ],
    e.contact && ['Contacto', 'text-[2cqw] opacity-75'],
    e.legalText && ['Texto legal', 'text-[1.7cqw] opacity-60'],
  ].filter(Boolean) as [string, string][];
  const typeStyle =
    design.style === 'ELEGANT'
      ? 'font-serif'
      : design.style === 'PLAYFUL'
        ? 'font-sans tracking-wide'
        : 'font-sans';
  const image = (
    <div
      className={`flex min-h-0 items-center justify-center overflow-hidden rounded-[3cqw] border border-dashed border-current/20 ${design.composition === 'PRODUCT_PANEL' ? 'bg-current/10' : 'bg-current/5'}`}
    >
      <div className="flex flex-col items-center gap-[1cqw] opacity-40">
        <ImageIcon aria-hidden="true" className="h-[9cqw] w-[9cqw]" />
        <span className="text-[2cqw]">Foto del producto</span>
      </div>
    </div>
  );
  const textBlock = (
    <ul
      className={`min-w-0 ${design.textDensity === 'MINIMAL' ? 'space-y-[1.2cqw]' : 'space-y-[0.8cqw]'}`}
    >
      {texts.map(([label, style]) => (
        <li key={label} className={`break-words leading-tight ${style}`}>
          {label}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="space-y-3">
      <div
        data-format={design.format}
        data-mode={design.mode}
        data-composition={design.composition}
        className={`relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-sm ${typeStyle} ${dark ? 'border-white/10 bg-[#19132b] text-white' : 'border-slate-300 bg-[#f1edff] text-[#251c3e]'}`}
        style={{
          aspectRatio: `${width} / ${height}`,
          containerType: 'inline-size',
          maxWidth: compact ? undefined : Math.min(360, (440 * width) / height),
        }}
      >
        {design.background === 'GRADIENT' && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-blue-500/20 to-violet-600/30"
          />
        )}
        {design.background === 'SCENE' && (
          <div
            aria-hidden="true"
            className="absolute -top-[20%] -right-[20%] size-[90%] rounded-full border-[10cqw] border-current/5"
          />
        )}
        {design.background === 'STUDIO' && (
          <div
            aria-hidden="true"
            className="absolute inset-x-[10%] bottom-[10%] h-[40%] rounded-[50%] bg-current/5 blur-xl"
          />
        )}
        <div
          className={`absolute inset-x-[7%] top-[17%] bottom-[12%] ${design.composition === 'SPLIT' ? 'grid grid-cols-[42%_1fr] items-center gap-[5%] [&>div]:h-full' : design.composition === 'TYPOGRAPHIC' ? 'flex items-center' : 'flex flex-col gap-[3cqw] [&>div]:flex-1'}`}
        >
          {design.composition !== 'TYPOGRAPHIC' && image}
          {textBlock}
        </div>
        {e.logo && (
          <span
            className={`absolute ${CORNER[design.logoPosition]} rounded border border-current/30 px-[2cqw] py-[0.7cqw] text-[2.1cqw] font-medium`}
          >
            Logo
          </span>
        )}
      </div>
      {!compact && (
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Esquema orientativo. Textos y colores de ejemplo; no es el diseño final generado.
        </p>
      )}
    </div>
  );
}
