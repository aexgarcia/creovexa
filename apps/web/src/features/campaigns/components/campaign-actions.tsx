'use client';

import Link from 'next/link';

import { Eye, MoreHorizontal, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { CampaignStatus } from '../types/campaign.types';

interface CampaignActionsProps {
  campaignId: string;
  status: CampaignStatus;
}

export function CampaignActions({ campaignId, status }: CampaignActionsProps) {
  const canEdit = status === 'DRAFT' || status === 'PENDING_APPROVAL';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Acciones de campaña" />}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/campaigns/${campaignId}`} />}>
          <Eye className="mr-2 size-4" />
          Ver detalle
        </DropdownMenuItem>

        {canEdit && (
          <DropdownMenuItem render={<Link href={`/campaigns/${campaignId}/edit`} />}>
            <Pencil className="mr-2 size-4" />
            Editar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
