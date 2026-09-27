'use client';

import { Loader2, Plug, Unplug } from 'lucide-react';

import type { IconType } from 'react-icons';

import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { useConnectSocialAccount } from '../hooks/use-connect-social-account';

import { useDisconnectSocialAccount } from '../hooks/use-disconnect-social-account';

import type { SocialAccount, SocialPlatform } from '../types/social-account.types';

import { SocialAccountStatusBadge } from './social-account-status-badge';

interface SocialAccountCardProps {
  account: SocialAccount;
}

const platformConfig: Record<
  SocialPlatform,
  {
    label: string;
    icon: IconType;
    backgroundColor: string;
  }
> = {
  FACEBOOK: {
    label: 'Facebook',
    icon: FaFacebookF,
    backgroundColor: '#1877F2',
  },

  INSTAGRAM: {
    label: 'Instagram',
    icon: FaInstagram,
    backgroundColor: '#E1306C',
  },

  TIKTOK: {
    label: 'TikTok',
    icon: FaTiktok,
    backgroundColor: '#000000',
  },
};

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function SocialAccountCard({ account }: SocialAccountCardProps) {
  const connectAccount = useConnectSocialAccount();

  const disconnectAccount = useDisconnectSocialAccount();

  const config = platformConfig[account.platform];

  const Icon = config.icon;

  const isConnected = account.status === 'CONNECTED';

  const isProcessing = connectAccount.isPending || disconnectAccount.isPending;

  async function handleConnect() {
    try {
      await connectAccount.mutateAsync({
        platform: account.platform,
      });

      toast.success(`${config.label} conectada correctamente`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo conectar la cuenta');
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectAccount.mutateAsync(account.id);

      toast.success(`${config.label} desconectada`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo desconectar la cuenta');
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex size-12 items-center justify-center rounded-xl bg-muted"
              style={{ backgroundColor: config.backgroundColor }}
            >
              <Icon className="size-6" />
            </div>

            <div>
              <CardTitle className="text-lg">{config.label}</CardTitle>

              <CardDescription>Cuenta para publicaciones</CardDescription>
            </div>
          </div>

          <SocialAccountStatusBadge status={account.status} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        {isConnected ? (
          <>
            <div>
              <p className="text-xs text-muted-foreground">Cuenta</p>

              <p className="mt-1 font-medium">{account.accountName ?? '—'}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Usuario</p>

              <p className="mt-1 text-sm">{account.username ?? '—'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Conectada</p>

                <p className="mt-1 text-sm">{formatDate(account.connectedAt)}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Expira</p>

                <p className="mt-1 text-sm">{formatDate(account.expiresAt)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
            <Plug className="size-7 text-muted-foreground" />

            <p className="mt-3 font-medium">Cuenta no conectada</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Conecta esta plataforma para poder publicar campañas.
            </p>
          </div>
        )}

        {account.lastError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-destructive">{account.lastError}</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {isConnected ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDisconnect}
            disabled={isProcessing}
          >
            {disconnectAccount.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Unplug className="mr-2 size-4" />
            )}
            Desconectar
          </Button>
        ) : (
          <Button className="w-full" onClick={handleConnect} disabled={isProcessing}>
            {connectAccount.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plug className="mr-2 size-4" />
            )}
            Conectar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
