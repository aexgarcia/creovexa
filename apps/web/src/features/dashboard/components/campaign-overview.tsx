import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Progress } from '@/components/ui/progress';

import type { CampaignStatusSummary } from '../types/dashboard.types';

interface CampaignOverviewProps {
  data: CampaignStatusSummary;
}

export function CampaignOverview({ data }: CampaignOverviewProps) {
  const total = data.draft + data.pendingApproval + data.approved + data.published + data.failed;

  const items = [
    {
      label: 'Publicadas',
      value: data.published,
    },
    {
      label: 'Pendientes de aprobación',
      value: data.pendingApproval,
    },
    {
      label: 'Aprobadas',
      value: data.approved,
    },
    {
      label: 'Borradores',
      value: data.draft,
    },
    {
      label: 'Fallidas',
      value: data.failed,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de campañas</CardTitle>

        <CardDescription>Distribución actual de las campañas.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {items.map((item) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>

                <span className="font-medium">{item.value}</span>
              </div>

              <Progress value={percentage} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
