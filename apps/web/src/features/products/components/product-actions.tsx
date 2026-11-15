'use client';

import Link from 'next/link';

import { useArchiveProduct } from '../hooks/use-archive-product';
import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductActionsProps {
  productId: string;
  archived: boolean;
  onArchiveChanged?: () => void;
}

export function ProductActions({ productId, archived, onArchiveChanged }: ProductActionsProps) {
  const archive = useArchiveProduct(onArchiveChanged);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Acciones del producto"
            disabled={archive.isPending}
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href={`/products/${productId}/edit`} />}>
          <Pencil className="mr-2 size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={archive.isPending}
          onClick={() => archive.mutate({ id: productId, archived: !archived })}
        >
          {archived ? (
            <ArchiveRestore className="mr-2 size-4" />
          ) : (
            <Archive className="mr-2 size-4" />
          )}
          {archived ? 'Restaurar' : 'Archivar'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
