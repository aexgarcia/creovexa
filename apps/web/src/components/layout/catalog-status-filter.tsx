import type { CatalogStatus } from '@/types/catalog-status';

export function CatalogStatusFilter({
  value,
  onChange,
}: {
  value: CatalogStatus;
  onChange: (status: CatalogStatus) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Disponibilidad del catálogo"
      className="inline-flex flex-wrap gap-1 rounded-xl border bg-control p-1"
    >
      {(
        [
          { value: 'active', label: 'Activos' },
          { value: 'archived', label: 'Archivados' },
          { value: 'all', label: 'Todos' },
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={
            'rounded-lg border px-3 py-1.5 text-sm transition-colors ' +
            (value === option.value
              ? 'border-input bg-accent text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
