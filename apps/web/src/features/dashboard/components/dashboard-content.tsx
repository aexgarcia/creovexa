import Link from 'next/link';
import { Plus, Package, Megaphone, CircleCheck, Clock3, ArrowUpRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { dashboardPreview } from '../mocks/dashboard-preview';
import { DashboardCampaignPanels, DashboardBrandPanels } from './dashboard-preview-panels';

export function DashboardContent() {
  const data = dashboardPreview;
  const stats = [
    {
      label: 'Campañas',
      value: data.totals.campaigns,
      detail: 'En todas las etapas',
      icon: Megaphone,
      href: '/campaigns',
      color: 'text-[#7fa0ff] bg-primary/10 border-primary/25',
    },
    {
      label: 'Productos y servicios',
      value: data.totals.products,
      detail: 'En el catálogo de ejemplo',
      icon: Package,
      href: '/products',
      color: 'text-[#a97cff] bg-brand-violet/10 border-brand-violet/25',
    },
    {
      label: 'Campañas publicadas',
      value: data.totals.published,
      detail: 'Dato de ejemplo',
      icon: CircleCheck,
      href: '/publications',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    },
    {
      label: 'Por aprobar',
      value: data.totals.pendingApproval,
      detail: 'Pendientes de revisión',
      icon: Clock3,
      href: '/campaigns',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tu estudio de marketing"
        description="Una vista de lo que podrás gestionar desde Creovexa."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href="/products/new" />}>
              <Package className="size-4" />
              Nuevo producto
            </Button>
            <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
              <Plus className="size-4" />
              Nueva campaña
            </Button>
          </div>
        }
      />
      <div
        role="note"
        className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 text-[13px] leading-relaxed"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
        <p>
          <b className="font-semibold">Dashboard de demostración.</b> Todos los indicadores,
          campañas, gráficas y avisos de esta vista son estáticos. No reflejan tu organización. La
          conexión a datos reales está pendiente; los accesos te llevan a las secciones de la
          aplicación.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, detail, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="group space-y-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl border ${color}`}
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="flex-1 text-[13px] text-muted-foreground">{label}</span>
              <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-brand-cyan" />
            </div>
            <div>
              <b className="font-mono text-3xl font-medium">{value}</b>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <DashboardCampaignPanels />
        <DashboardBrandPanels />
      </div>
    </div>
  );
}
