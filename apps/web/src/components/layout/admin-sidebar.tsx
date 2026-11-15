import { SidebarLogo } from './sidebar-logo';
import { SidebarNav } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function AdminSidebar() {
  return (
    <aside
      aria-label="Navegación principal"
      className="sticky top-0 z-30 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
    >
      <SidebarLogo />

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <SidebarNav />
      </div>

      <SidebarUser />
    </aside>
  );
}
