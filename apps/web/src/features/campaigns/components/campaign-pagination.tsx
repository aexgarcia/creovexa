import { Button } from '@/components/ui/button';
export function CampaignPagination({
  page,
  totalPages,
  pending,
  onChange,
}: {
  page: number;
  totalPages?: number;
  pending: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={page === 1 || pending}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {page}
        {totalPages !== undefined ? ` de ${Math.max(1, totalPages)}` : ''}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={!totalPages || page >= totalPages || pending}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </Button>
    </div>
  );
}
