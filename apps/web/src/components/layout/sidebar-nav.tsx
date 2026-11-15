'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavigationItem } from '@/config/navigation';

import { dashboardNavigation, secondaryNavigation } from '@/config/navigation';

import { cn } from '@/lib/utils';

interface NavGroupProps {
  title: string;
  items: NavigationItem[];
  onNavigate?: () => void;
}

function NavGroup({ title, items, onNavigate }: NavGroupProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      <p className="px-3 pt-4 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>

      {items.map((item) => {
        const Icon = item.icon;

        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={cn(
              'group flex h-10 items-center gap-3 rounded-[10px] border px-3 text-sm transition-colors',
              active
                ? 'border-primary/35 bg-[linear-gradient(90deg,rgba(47,91,245,.22),rgba(107,40,235,.06))] font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground',
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                'size-[18px] shrink-0',
                active ? 'text-brand-cyan' : 'text-muted-foreground group-hover:text-foreground',
              )}
            />

            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-2">
      <NavGroup title="Gestión" items={dashboardNavigation} onNavigate={onNavigate} />

      <NavGroup title="Sistema" items={secondaryNavigation} onNavigate={onNavigate} />
    </nav>
  );
}
