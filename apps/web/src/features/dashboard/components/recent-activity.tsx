import { CheckCircle2, CircleAlert, ImageIcon, Megaphone, Sparkles } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { DashboardActivity } from '../types/dashboard.types';

interface RecentActivityProps {
  activities: DashboardActivity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>

        <CardDescription>Eventos recientes dentro de Creovexa.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-5">
          {activities.map((activity) => {
            const Icon =
              activity.action === 'PUBLICATION_FAILED'
                ? CircleAlert
                : activity.action === 'CONTENT_GENERATED'
                  ? Sparkles
                  : activity.action === 'IMAGE_REGENERATED'
                    ? ImageIcon
                    : activity.action === 'PUBLICATION_SUCCEEDED'
                      ? CheckCircle2
                      : Megaphone;

            return (
              <div key={activity.id} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted/40">
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm">{activity.message}</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat('es-PE', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(activity.createdAt))}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
