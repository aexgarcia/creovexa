'use client';
import { useArchiveTemplate } from '../hooks/use-archive-template';
import Link from 'next/link';
import { Archive, ArchiveRestore, Copy, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateDesignPreview } from './template-design-preview';
import type { StoredTemplate } from '../types/stored-template.types';
import { COMPOSITION_LABELS, FORMAT_LABELS, STYLE_LABELS } from '../types/template-design-options';

export function TemplateCard({
  template,
  onArchiveChanged,
}: {
  template: StoredTemplate;
  onArchiveChanged?: () => void;
}) {
  const archive = useArchiveTemplate(onArchiveChanged);
  const revision = template.currentRevision;
  const design = revision.design;
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/40">
      <Link
        href={`/templates/${template.id}/edit`}
        aria-label={`Editar plantilla ${template.name}`}
        className="relative flex h-[250px] items-center justify-center border-b bg-control p-5"
      >
        <span className="absolute top-3 left-3 z-10 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          {FORMAT_LABELS[design.format]}
        </span>
        <div
          aria-hidden="true"
          className="w-full"
          style={{ maxWidth: (210 * revision.dimensions.width) / revision.dimensions.height }}
        >
          <TemplateDesignPreview design={design} compact />
        </div>
      </Link>
      <div className="space-y-3 p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-[15px] font-semibold">{template.name}</h2>
            {template.archivedAt && (
              <span className="mt-1 inline-block rounded border px-2 py-0.5 text-xs text-muted-foreground">
                Archivada
              </span>
            )}
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            r{revision.number}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {COMPOSITION_LABELS[design.composition]} · {STYLE_LABELS[design.style]}
        </p>
        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="rounded-full border bg-secondary px-2 py-0.5">
            {design.mode === 'DARK' ? 'Oscuro' : 'Claro'}
          </span>
          <span className="rounded-full border px-2 py-0.5 font-mono">
            {revision.dimensions.width} × {revision.dimensions.height}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/templates/${template.id}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={archive.isPending}
            onClick={() => archive.mutate({ id: template.id, archived: !template.archivedAt })}
          >
            {template.archivedAt ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            {archive.isPending ? 'Guardando…' : template.archivedAt ? 'Restaurar' : 'Archivar'}
          </Button>
          <span title="Duplicar plantillas: pendiente de implementar">
            <Button disabled variant="ghost" size="sm">
              <Copy className="size-3.5" />
              Duplicar · Próximamente
            </Button>
          </span>
        </div>
      </div>
    </article>
  );
}
