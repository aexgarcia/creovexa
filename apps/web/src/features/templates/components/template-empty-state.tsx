import Link from 'next/link';

import { LayoutTemplate } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function TemplateEmptyState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <LayoutTemplate className="size-6 text-primary" />
      </div>

      <h3 className="mt-4 text-lg font-semibold">No hay plantillas</h3>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Crea tu primera plantilla para utilizarla posteriormente en campañas.
      </p>

      <Button className="mt-5" nativeButton={false} render={<Link href="/templates/new" />}>
        Crear plantilla
      </Button>
    </div>
  );
}
