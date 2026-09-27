import Link from 'next/link';

import { PackagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function ProductEmptyState() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
        <PackagePlus className="size-6 text-primary" />
      </div>

      <h3 className="mt-4 text-lg font-semibold">No hay productos</h3>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Registra tu primer producto para comenzar a crear campañas promocionales.
      </p>

      <Button className="mt-5" nativeButton={false} render={<Link href="/products/new" />}>
        Crear producto
      </Button>
    </div>
  );
}
