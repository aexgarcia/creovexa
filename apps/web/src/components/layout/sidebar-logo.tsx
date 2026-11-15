import Image from 'next/image';
import Link from 'next/link';
export function SidebarLogo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-[22px]">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        aria-label="Creovexa, ir al dashboard"
        className="rounded-lg"
      >
        <Image
          src="/brand/creovexa.png"
          alt="Creovexa"
          width={480}
          height={119}
          priority
          className="h-auto w-[156px]"
        />
      </Link>
    </div>
  );
}
