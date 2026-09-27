import type { LucideIcon } from 'lucide-react';

import {
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Package,
  Send,
  Settings,
  Share2,
} from 'lucide-react';

export interface NavigationItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const dashboardNavigation: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Productos',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Plantillas',
    href: '/templates',
    icon: LayoutTemplate,
  },
  {
    title: 'Campañas',
    href: '/campaigns',
    icon: Megaphone,
  },
  {
    title: 'Cuentas sociales',
    href: '/social-accounts',
    icon: Share2,
  },
  {
    title: 'Publicaciones',
    href: '/publications',
    icon: Send,
  },
];

export const secondaryNavigation: NavigationItem[] = [
  {
    title: 'Configuración',
    href: '/settings',
    icon: Settings,
  },
];
