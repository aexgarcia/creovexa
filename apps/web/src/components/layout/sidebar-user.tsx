import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
export function SidebarUser({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex items-center gap-3 border-t border-sidebar-border px-[18px] py-3.5">
      <Avatar className="size-9 ring-2 ring-brand-violet/55 ring-offset-2 ring-offset-sidebar">
        <AvatarFallback className="bg-brand-gradient text-xs font-semibold text-white">
          CV
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-medium">Espacio de trabajo</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">Creovexa Studio</p>
      </div>
      <Link
        href="/settings"
        onClick={onNavigate}
        aria-label="Configuración del espacio"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      >
        <Settings className="size-4" />
      </Link>
    </div>
  );
}
