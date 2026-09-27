'use client';

import { Share2 } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';

import { Skeleton } from '@/components/ui/skeleton';

import { useSocialAccounts } from '../hooks/use-social-accounts';

import { SocialAccountCard } from './social-account-card';

export function SocialAccountList() {
  const { data: accounts, isLoading, isError } = useSocialAccounts();

  const connectedCount = accounts?.filter((account) => account.status === 'CONNECTED').length ?? 0;

  return (
    <div className="space-y-6">
      <p role="note" className="rounded-lg border bg-muted p-4 text-sm">
        Vista de demostración: conectar o desconectar solo modifica datos temporales. No se vinculan
        cuentas reales.
      </p>
      <PageHeader
        title="Cuentas sociales"
        description="Administra las plataformas utilizadas para publicar tus campañas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
              <Share2 className="size-5 text-primary" />
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Plataformas conectadas</p>

              <p className="text-2xl font-semibold">{connectedCount} / 3</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <Skeleton key={index} className="h-[390px] w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          No se pudieron cargar las cuentas sociales.
        </div>
      )}

      {!isLoading && !isError && accounts && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <SocialAccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  );
}
