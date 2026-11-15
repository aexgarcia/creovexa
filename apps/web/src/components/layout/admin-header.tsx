import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileSidebar } from './mobile-sidebar';
import { HeaderBreadcrumbs } from './header-breadcrumbs';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-sidebar/85 px-4 backdrop-blur-[14px] md:px-6 lg:gap-4 lg:px-10">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:rounded-lg focus:bg-card focus:p-2"
      >
        Ir al contenido
      </a>
      <MobileSidebar />
      <HeaderBreadcrumbs />
      <div className="ml-auto flex items-center gap-2.5">
        <div
          title="Búsqueda global: próximamente"
          className="hidden h-[38px] w-[240px] items-center gap-2 rounded-[10px] border border-input bg-control px-3 text-muted-foreground xl:flex"
        >
          <Search aria-hidden="true" className="size-4" />
          <input
            disabled
            aria-label="Búsqueda global, próximamente"
            placeholder="Buscar…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
          />
        </div>
        <span title="Notificaciones: próximamente">
          <Button disabled variant="outline" size="icon" aria-label="Notificaciones, próximamente">
            <Bell className="size-[18px]" />
          </Button>
        </span>
      </div>
    </header>
  );
}
