'use client';

import { ChevronUp } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function SidebarUser() {
  return (
    <div className="border-t p-3">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-muted"
      >
        <Avatar className="size-9">
          <AvatarFallback>AG</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Administrador</p>

          <p className="truncate text-xs text-muted-foreground">admin@creovexa.com</p>
        </div>

        <ChevronUp className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}
