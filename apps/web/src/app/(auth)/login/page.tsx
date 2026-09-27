import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-xl font-semibold">Acceso a Creovexa</h1>
      <p>El inicio de sesión todavía no está disponible. Este entorno es de desarrollo.</p>
      <Link href="/products" className="underline">
        Ir al catálogo
      </Link>
    </main>
  );
}
