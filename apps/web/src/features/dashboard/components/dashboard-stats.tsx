import { CheckCircle2, Megaphone, Package, Timer } from 'lucide-react';

import type { DashboardMetrics } from '../types/dashboard.types';

import { MetricCard } from './metric-card';

interface DashboardStatsProps {
  metrics: DashboardMetrics;
}

export function DashboardStats({ metrics }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        title="Campañas"
        value={metrics.campaigns.value}
        variation={metrics.campaigns.variation}
        description="respecto al mes anterior"
        icon={Megaphone}
      />

      <MetricCard
        title="Productos"
        value={metrics.products.value}
        variation={metrics.products.variation}
        description="registrados"
        icon={Package}
      />

      <MetricCard
        title="Publicaciones"
        value={metrics.publications.value}
        variation={metrics.publications.variation}
        description="publicadas correctamente"
        icon={CheckCircle2}
      />

      <MetricCard
        title="Pendientes"
        value={metrics.pendingApproval.value}
        description="requieren aprobación"
        icon={Timer}
      />
    </div>
  );
}
