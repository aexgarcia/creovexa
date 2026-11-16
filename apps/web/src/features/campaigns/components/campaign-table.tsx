'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, ImageOff, Megaphone, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CampaignObjective, StoredCampaign } from '../types/stored-campaign.types';
import { CampaignStateBadge } from './campaign-state-badge';

const objectives: Record<CampaignObjective, string> = {
  PROMOTION: 'Promoción',
  LAUNCH: 'Lanzamiento',
  SEASONAL: 'Temporada',
  AWARENESS: 'Recordación',
  EVENT: 'Evento',
};

export function CampaignTable({ campaigns }: { campaigns: StoredCampaign[] }) {
  return (
    <Table className="table-fixed text-sm [&_td]:px-3 [&_td]:py-4 [&_th]:px-3 md:[&_td]:px-5 md:[&_th]:px-5">
      <TableHeader>
        <TableRow className="bg-white/[0.015] text-[11px] uppercase tracking-[0.06em] [&_th]:font-medium [&_th]:text-muted-foreground">
          <TableHead>Campaña</TableHead>
          <TableHead className="hidden w-[140px] xl:table-cell">Objetivo</TableHead>
          <TableHead className="hidden w-[210px] md:table-cell">Estado</TableHead>
          <TableHead className="hidden w-[125px] lg:table-cell">Creada</TableHead>
          <TableHead className="w-14 md:w-24">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => {
          const href = '/campaigns/' + encodeURIComponent(campaign.id);
          return (
            <TableRow key={campaign.id}>
              <TableCell>
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <FlyerThumbnail url={campaign.candidateContent?.finalAssetUrl} />
                  <div className="min-w-0 space-y-1.5">
                    <Link
                      href={href}
                      className="block truncate font-medium hover:text-brand-cyan"
                      title={campaign.title}
                    >
                      {campaign.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {campaign.occasion || campaign.cta}
                    </p>
                    <div className="pt-0.5 md:hidden">
                      <CampaignStateBadge status={campaign.status} />
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <span className="rounded-lg border bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
                  {objectives[campaign.objective]}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <CampaignStateBadge status={campaign.status} />
              </TableCell>
              <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                <time dateTime={campaign.createdAt}>
                  {new Intl.DateTimeFormat('es-PE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(campaign.createdAt))}
                </time>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {campaign.status === 'DRAFT' && (
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon-sm"
                      className="hidden md:inline-flex"
                      render={<Link href={href + '/edit'} />}
                      aria-label={'Editar borrador ' + campaign.title}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={href} />}
                    aria-label={'Ver campaña ' + campaign.title}
                  >
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function FlyerThumbnail({ url }: { url: string | null | undefined }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = Boolean(url && failedUrl === url);
  const Icon = failed ? ImageOff : Megaphone;
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-primary/10 p-1 sm:size-14">
      {url && !failed ? (
        <Image
          src={url}
          alt=""
          width={56}
          height={56}
          unoptimized
          className="h-full w-full rounded-lg object-contain"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <Icon
          role="img"
          aria-label={failed ? 'Flyer no disponible' : 'Sin flyer generado'}
          className="size-5 text-brand-cyan/70"
        />
      )}
    </div>
  );
}
