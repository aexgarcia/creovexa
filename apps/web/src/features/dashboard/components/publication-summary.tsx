import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { PlatformPublicationSummary, SocialPlatform } from '../types/dashboard.types';

interface PublicationSummaryProps {
  publications: PlatformPublicationSummary[];
}

const platformConfig: Record<
  SocialPlatform,
  {
    label: string;
    icon: React.ElementType;
    color?: string;
  }
> = {
  FACEBOOK: {
    label: 'Facebook',
    icon: FaFacebookF,
    color: 'bg-blue-600',
  },

  INSTAGRAM: {
    label: 'Instagram',
    icon: FaInstagram,
    color: 'bg-pink-500',
  },

  TIKTOK: {
    label: 'TikTok',
    icon: FaTiktok,
    color: 'bg-black',
  },
};

export function PublicationSummary({ publications }: PublicationSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicaciones</CardTitle>

        <CardDescription>Rendimiento por plataforma.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {publications.map((publication) => {
          const config = platformConfig[publication.platform];
          const Icon = config.icon;

          return (
            <div key={publication.platform} className="flex items-center gap-4">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border text-white ${config.color || 'bg-muted/40'}`}
              >
                <Icon className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium">{config.label}</p>

                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{publication.published} publicadas</span>

                  <span>{publication.pending} pendientes</span>

                  {publication.failed > 0 && (
                    <span className="text-destructive">{publication.failed} fallidas</span>
                  )}
                </div>
              </div>

              <span className="text-lg font-semibold">{publication.published}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
