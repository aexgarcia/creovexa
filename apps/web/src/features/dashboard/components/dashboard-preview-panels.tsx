import { CampaignPipelinePreview } from './campaign-pipeline-preview';
import Link from 'next/link';
import { Check, Clock3, ArrowUpRight, Sparkles } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';
import { CompletionRing } from '@/components/ui/completion-ring';
import { Button } from '@/components/ui/button';
import { dashboardPreview } from '../mocks/dashboard-preview';

function PanelTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
    </div>
  );
}

export function DashboardCampaignPanels() {
  const data = dashboardPreview;
  return (
    <div className="min-w-0 space-y-5">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <PanelTitle
            title="Recorrido de tus campañas"
            description="De borrador a publicada · ejemplo"
          />
          <span className="rounded-full border bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            {data.totals.campaigns} en total
          </span>
        </div>
        <div className="px-5 pb-5 sm:px-6">
          <CampaignPipelinePreview stages={data.stages} total={data.totals.campaigns} />
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <p>
              Publicadas parcialmente <b className="ml-2 text-foreground">0</b>
            </p>
            <p>
              Necesitan reintento <b className="ml-2 text-foreground">0</b>
            </p>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
          <PanelTitle title="Campañas recientes" description="Nombres y fechas de ejemplo" />
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/campaigns" />}
          >
            Ver campañas
            <ArrowUpRight className="size-3.5" />
          </Button>
        </div>
        <table className="w-full table-fixed text-left text-[13px]">
          <thead className="border-y bg-control/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium sm:px-6">Campaña</th>
              <th className="w-[120px] px-2 py-3 font-medium">Estado</th>
              <th className="hidden w-[90px] px-5 py-3 text-right font-medium sm:table-cell">
                Creada
              </th>
            </tr>
          </thead>
          <tbody>
            {data.recent.map((row) => (
              <tr key={row.title} className="border-b last:border-0">
                <td className="px-5 py-4 sm:px-6">
                  <span className="block truncate font-medium" title={row.title}>
                    {row.title}
                  </span>
                </td>
                <td className="px-2 py-4">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]"
                    style={{
                      color: row.color,
                      borderColor: row.color + '55',
                      backgroundColor: row.color + '12',
                    }}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {row.status}
                  </span>
                </td>
                <td className="hidden px-5 py-4 text-right text-xs text-muted-foreground sm:table-cell">
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="space-y-5 rounded-2xl border border-dashed bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelTitle
            title="Generación con IA"
            description="Rendimiento ilustrativo · pendiente de métricas reales"
          />
          <Sparkles className="size-5 text-brand-cyan" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['86 %', 'Generaciones completas'],
            ['1 min 40 s', 'Tiempo promedio'],
            ['1', 'Fallo de ejemplo'],
          ].map(([value, label]) => (
            <div key={label}>
              <b className="block font-mono text-xl font-medium">{value}</b>
              <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div
          role="img"
          aria-label="Gráfica estática de ejemplo: 1, 2, 1, 4, 3, 5, 4 y 7 campañas por semana"
          className="flex h-24 items-end gap-2 border-b"
        >
          {data.weekly.map((count, index) => (
            <span
              key={index}
              className="flex-1 rounded-t bg-brand-gradient opacity-70"
              style={{ height: `${(count / 7) * 100}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Campañas por semana · ocho semanas de ejemplo
        </p>
      </section>
    </div>
  );
}

export function DashboardBrandPanels() {
  const data = dashboardPreview;
  const complete = data.checklist.filter((item) => item.complete).length;
  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1">
          <PanelTitle
            title="Tu marca, lista para la IA"
            description="Completitud ilustrativa del kit"
          />
          <CompletionRing
            value={(complete / data.checklist.length) * 100}
            label="Kit de ejemplo completado"
          />
        </div>
        <ul className="mt-5 divide-y">
          {data.checklist.map((item) => (
            <li key={item.title} className="flex items-start gap-3 py-3">
              <span
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border ${item.complete ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-input bg-secondary text-muted-foreground'}`}
              >
                {item.complete ? <Check className="size-3.5" /> : <Clock3 className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[13px] font-medium">{item.title}</b>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
              </div>
            </li>
          ))}
        </ul>
        <Link
          href="/settings"
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#7fa0ff] hover:underline"
        >
          Configurar mi marca
          <ArrowUpRight className="size-3.5" />
        </Link>
      </section>
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <PanelTitle
          title="Publicaciones por red"
          description="Distribución de ejemplo, sin envíos reales"
        />
        <div className="mt-5 space-y-4">
          {[
            { name: 'Facebook', icon: FaFacebookF, count: 2, color: 'bg-blue-600' },
            {
              name: 'Instagram',
              icon: FaInstagram,
              count: 1,
              color: 'bg-gradient-to-br from-orange-400 to-pink-600',
            },
            { name: 'TikTok', icon: FaTiktok, count: 0, color: 'bg-black' },
          ].map(({ name, icon: Icon, count, color }) => (
            <div key={name} className="flex items-center gap-3">
              <span
                className={`grid size-9 place-items-center rounded-xl border text-white ${color}`}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex-1">
                <b className="text-[13px] font-medium">{name}</b>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-brand-gradient"
                    style={{ width: `${(count / 2) * 100}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-sm">{count}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          La conexión y publicación en redes siguen pendientes.
        </p>
      </section>
      <section className="rounded-2xl border border-dashed bg-card p-5 sm:p-6">
        <PanelTitle title="Ofertas por vencer" description="Propuesta · datos de ejemplo" />
        <ul className="mt-5 divide-y text-[13px]">
          {[
            ['Café de temporada', 'En 2 días'],
            ['Pack de favoritos', 'En 6 días'],
          ].map(([title, date]) => (
            <li key={title} className="flex items-center gap-2 py-3">
              <Clock3 className="size-4 shrink-0 text-amber-400" />
              <span className="min-w-0 flex-1 truncate">{title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{date}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
