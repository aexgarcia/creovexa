import { SidebarLogo } from './sidebar-logo';
import { SidebarNav } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background lg:flex">
      <SidebarLogo />

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>

      <SidebarUser />
    </aside>
  );
}
