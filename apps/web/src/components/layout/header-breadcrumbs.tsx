'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { dashboardNavigation, secondaryNavigation } from '@/config/navigation';

export function HeaderBreadcrumbs() {
  const pathname = usePathname();
  const section = [...dashboardNavigation, ...secondaryNavigation].find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  );
  if (!section) return null;
  const nested = pathname !== section.href;
  const action = pathname.endsWith('/new')
    ? 'Crear'
    : pathname.endsWith('/edit')
      ? 'Editar'
      : 'Detalle';
  return (
    <nav aria-label="Ruta actual" className="flex min-w-0 items-center gap-2 text-[13px]">
      <span className="hidden text-muted-foreground sm:inline">
        {secondaryNavigation.includes(section) ? 'Sistema' : 'Gestión'}
      </span>
      <ChevronRight aria-hidden="true" className="hidden size-3.5 text-muted-foreground sm:block" />
      {nested ? (
        <Link href={section.href} className="truncate text-muted-foreground hover:text-foreground">
          {section.title}
        </Link>
      ) : (
        <span aria-current="page" className="truncate font-medium">
          {section.title}
        </span>
      )}
      {nested && (
        <>
          <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <span aria-current="page" className="font-medium">
            {action}
          </span>
        </>
      )}
    </nav>
  );
}
