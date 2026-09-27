import type { LucideIcon } from 'lucide-react';

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  variation?: number;
}

export function MetricCard({ title, value, description, icon: Icon, variation }: MetricCardProps) {
  const hasVariation = variation !== undefined;
  const positive = variation !== undefined && variation >= 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>

        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-12 text-primary" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-4xl font-semibold tracking-tight">{value}</div>

        <div className="mt-3 flex items-center gap-2 text-sm">
          {hasVariation && (
            <span
              className={
                positive
                  ? 'flex items-center font-medium text-emerald-500'
                  : 'flex items-center font-medium text-destructive'
              }
            >
              {positive ? (
                <ArrowUpRight className="mr-1 size-4" />
              ) : (
                <ArrowDownRight className="mr-1 size-4" />
              )}
              {Math.abs(variation)}%
            </span>
          )}

          <span className="text-muted-foreground">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
