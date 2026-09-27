import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export function SidebarLogo() {
  return (
    <div className="flex h-16 items-center border-b px-5">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>

        <div className="leading-tight">
          <p className="font-semibold tracking-tight">Creovexa</p>

          <p className="text-xs text-muted-foreground">AI Marketing</p>
        </div>
      </Link>
    </div>
  );
}
