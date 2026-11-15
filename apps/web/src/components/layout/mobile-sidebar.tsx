'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

import { SidebarLogo } from './sidebar-logo';
import { SidebarNav } from './sidebar-nav';
import { SidebarUser } from './sidebar-user';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
        <Menu className="size-5" />

        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex max-w-[85vw] flex-col border-sidebar-border bg-sidebar p-0 data-[side=left]:w-[264px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Menú de navegación</SheetTitle>
        </SheetHeader>

        <SidebarLogo onNavigate={() => setOpen(false)} />

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>

        <SidebarUser onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
