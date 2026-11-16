import Link from 'next/link';
import { ArrowRight, CheckCheck, Clock3, Megaphone, Palette, Plug, Share2 } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

const platforms = [
  {
    name: 'Facebook',
    icon: FaFacebookF,
    iconClass: 'bg-[#1877f2]/15 text-[#1877f2]',
    accentClass: 'bg-[#1877f2]',
    description: 'Un espacio para las novedades y promociones de tu negocio.',
  },
  {
    name: 'Instagram',
    icon: FaInstagram,
    iconClass: 'bg-[#e1306c]/15 text-[#e1306c]',
    accentClass: 'bg-gradient-to-r from-[#f77737] via-[#e1306c] to-[#833ab4]',
    description: 'Dale protagonismo a tu marca y a sus productos con contenido visual.',
  },
  {
    name: 'TikTok',
    icon: FaTiktok,
    iconClass: 'border border-border bg-control text-foreground',
    accentClass: 'bg-gradient-to-r from-[#25f4ee] to-[#fe2c55]',
    description: 'Acerca tu negocio a nuevas audiencias con su propia personalidad.',
  },
];

export function SocialAccountList() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas sociales"
        description="Los canales donde tu marca se encuentra con su comunidad."
      />

      <section
        aria-labelledby="social-availability-title"
        className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6"
      >
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan">
              <Share2 aria-hidden="true" className="size-6" />
            </div>
            <div className="max-w-xl">
              <h2 id="social-availability-title" className="text-base font-semibold tracking-tight">
                Tu próxima conexión empieza aquí
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                La conexión con redes sociales estará disponible próximamente. Mientras tanto,
                puedes preparar tus campañas y revisar sus flyers.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/5 px-3 py-1.5 text-xs font-medium text-brand-cyan">
            <Clock3 aria-hidden="true" className="size-3.5" /> Próximamente
          </span>
        </div>
      </section>

      <section aria-labelledby="social-platforms-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="social-platforms-title" className="text-sm font-semibold">
            Plataformas previstas
          </h2>
          <p className="text-xs text-muted-foreground">Facebook · Instagram · TikTok</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {platforms.map(({ name, icon: Icon, iconClass, accentClass, description }) => (
            <article
              key={name}
              aria-labelledby={`platform-${name}`}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card"
            >
              <div aria-hidden="true" className={`h-1 ${accentClass}`} />
              <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${iconClass}`}
                  >
                    <Icon aria-hidden="true" className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3" /> Próximamente
                  </span>
                </div>
                <div>
                  <h3 id={`platform-${name}`} className="text-lg font-semibold tracking-tight">
                    {name}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
                <div className="mt-auto flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed bg-control/50 px-4 py-5 text-center">
                  <Plug aria-hidden="true" className="size-5 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Tu cuenta tendrá su lugar aquí</p>
                  <p
                    id={`platform-${name}-availability`}
                    className="mt-1.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    La vinculación con {name} aún no está disponible.
                  </p>
                </div>
                <Button
                  disabled
                  variant="outline"
                  className="w-full"
                  aria-describedby={`platform-${name}-availability`}
                >
                  <Plug aria-hidden="true" className="size-4" /> Conectar {name}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="social-prepare-title"
        className="grid gap-6 rounded-2xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8"
      >
        <div>
          <div className="mb-3 flex items-center gap-2 text-brand-cyan">
            <CheckCheck aria-hidden="true" className="size-5" />
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Prepara tu contenido
            </span>
          </div>
          <h2 id="social-prepare-title" className="text-xl font-semibold tracking-tight">
            Una marca lista para su siguiente paso
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Completa la identidad de tu negocio y deja tus piezas revisadas. Aprobar un flyer lo
            guarda como contenido aprobado; la publicación en redes estará disponible más adelante.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/settings"
            className="group flex min-w-0 flex-col rounded-xl border bg-control/50 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Palette aria-hidden="true" className="size-5 text-brand-cyan" />
            <span className="mt-3 text-sm font-medium">Revisa tu marca</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Logo, colores y voz de tu negocio.
            </span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium">
              Ir a configuración <ArrowRight aria-hidden="true" className="size-3.5" />
            </span>
          </Link>
          <Link
            href="/campaigns"
            className="group flex min-w-0 flex-col rounded-xl border bg-control/50 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Megaphone aria-hidden="true" className="size-5 text-brand-cyan" />
            <span className="mt-3 text-sm font-medium">Prepara tus campañas</span>
            <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Crea, revisa y aprueba tus flyers.
            </span>
            <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium">
              Ver campañas <ArrowRight aria-hidden="true" className="size-3.5" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
