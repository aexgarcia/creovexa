'use client';

import { useMemo, useState } from 'react';

import { Loader2, Send } from 'lucide-react';

import type { IconType } from 'react-icons';

import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

import { Checkbox } from '@/components/ui/checkbox';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { useSocialAccounts } from '@/features/social-accounts/hooks/use-social-accounts';

import type {
  SocialAccount,
  SocialPlatform,
} from '@/features/social-accounts/types/social-account.types';

import { usePublishCampaign } from '../hooks/use-publish-campaign';

interface PublishCampaignDialogProps {
  campaignId: string;
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

export function PublishCampaignDialog({ campaignId }: PublishCampaignDialogProps) {
  const [open, setOpen] = useState(false);

  const [selection, setSelection] = useState<SocialPlatform[] | null>(null);

  const { data: accounts, isLoading } = useSocialAccounts();

  const publishCampaign = usePublishCampaign();

  const connectedAccounts = useMemo(() => {
    return accounts?.filter((account) => account.status === 'CONNECTED') ?? [];
  }, [accounts]);

  const availablePlatforms = connectedAccounts.map((account) => account.platform);
  const selectedPlatforms = (selection ?? availablePlatforms).filter((platform) =>
    availablePlatforms.includes(platform),
  );

  function togglePlatform(platform: SocialPlatform) {
    setSelection(
      selectedPlatforms.includes(platform)
        ? selectedPlatforms.filter((item) => item !== platform)
        : [...selectedPlatforms, platform],
    );
  }

  async function handlePublish() {
    if (selectedPlatforms.length === 0) {
      toast.error('Selecciona al menos una plataforma');

      return;
    }

    try {
      await publishCampaign.mutateAsync({
        campaignId,

        platforms: selectedPlatforms,
      });

      toast.success('Publicación procesada correctamente');

      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo publicar la campaña');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setSelection(null);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Send className="mr-2 size-4" />
        Publicar
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publicar campaña</DialogTitle>

          <DialogDescription>
            Selecciona las plataformas donde deseas publicar esta campaña.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : connectedAccounts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="font-medium">No hay cuentas conectadas</p>

              <p className="mt-1 text-sm text-muted-foreground">
                Conecta al menos una cuenta social antes de publicar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedAccounts.map((account) => (
                <SocialPlatformOption
                  key={account.id}
                  account={account}
                  checked={selectedPlatforms.includes(account.platform)}
                  onCheckedChange={() => togglePlatform(account.platform)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={publishCampaign.isPending}
          >
            Cancelar
          </Button>

          <Button
            onClick={handlePublish}
            disabled={publishCampaign.isPending || selectedPlatforms.length === 0}
          >
            {publishCampaign.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            Publicar en {selectedPlatforms.length}{' '}
            {selectedPlatforms.length === 1 ? 'plataforma' : 'plataformas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SocialPlatformOptionProps {
  account: SocialAccount;

  checked: boolean;

  onCheckedChange: () => void;
}

function SocialPlatformOption({ account, checked, onCheckedChange }: SocialPlatformOptionProps) {
  const config = platformConfig[account.platform];

  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onCheckedChange}
      className="flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        onClick={(event) => event.stopPropagation()}
      />

      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
        style={{ backgroundColor: config.backgroundColor }}
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium">{config.label}</p>

        <p className="truncate text-sm text-muted-foreground">
          {account.username ?? account.accountName ?? 'Cuenta conectada'}
        </p>
      </div>

      <span className="text-xs font-medium text-emerald-500">Conectada</span>
    </button>
  );
}
