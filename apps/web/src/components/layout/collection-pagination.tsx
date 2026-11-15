import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CollectionPagination({
  page,
  totalPages,
  total,
  limit,
  busy,
  onPageChange,
  label,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const start = total ? (page - 1) * limit + 1 : 0;
  const end = Math.min(page * limit, total);
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-[13px] text-muted-foreground"
    >
      <span>
        Mostrando {start}–{end} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={busy || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span
          aria-current="page"
          className="rounded-lg border border-input bg-secondary px-3 py-1.5 font-mono text-xs text-foreground"
        >
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Página siguiente"
          disabled={busy || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
