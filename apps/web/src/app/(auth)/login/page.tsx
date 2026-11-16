import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCheck,
  Eye,
  Layers3,
  LockKeyhole,
  Mail,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section
        aria-label="Creovexa"
        className="relative flex flex-col overflow-hidden border-b bg-card p-6 sm:p-10 lg:min-h-svh lg:border-r lg:border-b-0 lg:p-12 xl:p-16"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-32 size-[440px] rounded-full bg-brand-violet/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-brand-cyan/5 blur-3xl"
        />
        <div className="relative">
          <Image
            src="/brand/creovexa.png"
            alt="Creovexa"
            width={480}
            height={119}
            preload
            className="h-auto w-[180px] sm:w-[200px]"
          />
        </div>
        <div className="relative my-auto hidden max-w-xl py-16 lg:block">
          <p className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-widest text-brand-cyan uppercase">
            <Sparkles aria-hidden="true" className="size-4" /> Un espacio para tu marca
          </p>
          <h2 className="max-w-[15ch] text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl xl:text-5xl">
            De tu catálogo a tu próxima campaña.
          </h2>
          <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
            Dale forma a tus ideas con la identidad de tu negocio. Prepara el mensaje, revisa el
            flyer y conserva cada versión.
          </p>
          <ol className="mt-9 hidden space-y-3 sm:block" aria-label="Prepara tu campaña">
            {[
              {
                icon: Layers3,
                title: 'Todo parte de tu marca',
                description: 'Tu catálogo, tus colores y tu forma de comunicar.',
              },
              {
                icon: Megaphone,
                title: 'Una idea toma forma',
                description: 'Texto e imagen para cada campaña.',
              },
              {
                icon: CheckCheck,
                title: 'La última palabra es tuya',
                description: 'Revisa y aprueba el contenido antes de publicarlo.',
              },
            ].map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border bg-control/50 p-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-brand-cyan/15 bg-brand-cyan/5 text-brand-cyan">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="relative hidden text-xs text-muted-foreground lg:block">
          Creovexa · Tu contenido, con identidad propia.
        </p>
      </section>

      <section
        aria-labelledby="login-title"
        className="flex items-center justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-12"
      >
        <div className="w-full max-w-[400px]">
          <div className="mb-6 flex size-11 items-center justify-center rounded-xl border bg-card text-brand-cyan">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <h1 id="login-title" className="text-[30px] leading-tight font-semibold tracking-tight">
            Bienvenido a Creovexa
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Tu espacio para preparar y revisar las campañas de tu negocio.
          </p>
          <div
            id="login-availability"
            className="mt-6 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 p-4"
          >
            <p className="text-xs font-semibold text-brand-cyan">Acceso próximamente</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              El inicio de sesión aún no está disponible. Este entorno es de desarrollo.
            </p>
          </div>
          <fieldset disabled aria-describedby="login-availability" className="mt-6 space-y-5">
            <legend className="sr-only">Inicio de sesión no disponible</legend>
            <div className="space-y-2.5">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground"
                />
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@tuempresa.com"
                  disabled
                  className="pl-10 disabled:bg-control disabled:opacity-100"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground"
                />
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  disabled
                  className="px-10 disabled:bg-control disabled:opacity-100"
                />
                <Eye
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3.5 right-3.5 size-4 text-muted-foreground"
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                La recuperación de contraseña estará disponible junto al inicio de sesión.
              </p>
            </div>
            <Button
              type="button"
              disabled
              className="h-11 w-full"
              aria-describedby="login-availability"
            >
              Iniciar sesión <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </fieldset>
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            ¿Necesitas una cuenta? El administrador da de alta los accesos de tu organización.
          </p>
          <div className="mt-8 border-t pt-5 text-center">
            <p className="text-[11px] text-muted-foreground">Entorno de desarrollo</p>
            <Link
              href="/products"
              className="mt-2 inline-flex items-center gap-2 rounded-sm text-xs font-medium text-foreground transition-colors hover:text-brand-cyan focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Ir al catálogo de desarrollo <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
