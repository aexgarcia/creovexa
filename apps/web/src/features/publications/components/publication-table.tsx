import Link from 'next/link';

import { ExternalLink, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { PublicationRecord } from '../types/publication.types';

import { PublicationPlatform } from './publication-platform';

import { PublicationStatusBadge } from './publication-status-badge';

interface PublicationTableProps {
  publications: PublicationRecord[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function PublicationTable({ publications }: PublicationTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaña</TableHead>

            <TableHead>Plataforma</TableHead>

            <TableHead>Estado</TableHead>

            <TableHead>Fecha</TableHead>

            <TableHead>Resultado</TableHead>

            <TableHead className="w-24">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {publications.map((publication) => (
            <TableRow key={publication.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{publication.campaignName}</p>

                  <p className="mt-1 text-xs text-muted-foreground">{publication.campaignId}</p>
                </div>
              </TableCell>

              <TableCell>
                <PublicationPlatform platform={publication.platform} />
              </TableCell>

              <TableCell>
                <PublicationStatusBadge status={publication.status} />
              </TableCell>

              <TableCell className="text-muted-foreground">
                {formatDate(publication.publishedAt)}
              </TableCell>

              <TableCell>
                {publication.failureReason ? (
                  <p className="max-w-xs text-sm text-destructive">{publication.failureReason}</p>
                ) : publication.externalPublicationId ? (
                  <p className="max-w-xs truncate text-sm text-muted-foreground">
                    ID: {publication.externalPublicationId}
                  </p>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    nativeButton={false}
                    render={<Link href={`/campaigns/${publication.campaignId}`} />}
                  >
                    <Eye className="size-4" />
                  </Button>

                  {publication.externalUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      nativeButton={false}
                      render={<a href={publication.externalUrl} target="_blank" rel="noreferrer" />}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
