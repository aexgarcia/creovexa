import { Bell, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/layout/user-menu';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur lg:px-6">
      <MobileSidebar />

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input placeholder="Buscar..." className="w-64 pl-9" />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />

          <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}
