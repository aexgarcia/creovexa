import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">Creovexa</h1>
      <p>Administra tus productos, plantillas y campañas.</p>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Abrir CMS
      </Button>
    </main>
  );
}
