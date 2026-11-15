import type { TemplateComposition } from '../types/template-design';

export function TemplateCompositionSymbol({ composition }: { composition: TemplateComposition }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-10 w-9 shrink-0 overflow-hidden rounded-md border border-current/25 bg-current/5"
    >
      {composition !== 'TYPOGRAPHIC' && (
        <span
          className={`absolute rounded-sm border border-current/30 bg-current/15 ${composition === 'SPLIT' ? 'inset-y-1 left-1 w-3' : composition === 'PRODUCT_PANEL' ? 'inset-x-1 top-1 h-5' : composition === 'SCENE' ? 'inset-x-0 top-0 h-7' : 'inset-x-2 top-1 h-5'}`}
        />
      )}
      <span
        className={`absolute space-y-1 ${composition === 'SPLIT' ? 'top-2 right-1 w-2' : 'inset-x-1 bottom-1.5'}`}
      >
        <span className="block h-1 rounded bg-current/70" />
        <span className="block h-0.5 w-2/3 rounded bg-current/30" />
      </span>
    </span>
  );
}
