import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Progress } from '@/components/ui/progress';

import type { DashboardSummary } from '../services/dashboard.service';
import { campaignStatusLabels } from '@/features/campaigns/types/stored-campaign.types';

interface CampaignOverviewProps {
  data: DashboardSummary['campaignsByStatus'];
}

export function CampaignOverview({ data }: CampaignOverviewProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const items = Object.entries(campaignStatusLabels).map(([status, label]) => ({
    label,
    value: data.find((row) => row.status === status)?.count ?? 0,
  }));

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
