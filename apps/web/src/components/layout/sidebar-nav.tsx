'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { NavigationItem } from '@/config/navigation';

import { dashboardNavigation, secondaryNavigation } from '@/config/navigation';

import { cn } from '@/lib/utils';

interface NavGroupProps {
  title: string;
  items: NavigationItem[];
}

function NavGroup({ title, items }: NavGroupProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>

      {items.map((item) => {
        const Icon = item.icon;

        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />

            <span>{item.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-6">
      <NavGroup title="Gestión" items={dashboardNavigation} />

      <NavGroup title="Sistema" items={secondaryNavigation} />
    </nav>
  );
}
