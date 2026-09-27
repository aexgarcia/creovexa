import { Badge } from '@/components/ui/badge';

import type { SocialAccountStatus } from '../types/social-account.types';

interface SocialAccountStatusBadgeProps {
  status: SocialAccountStatus;
}

export function SocialAccountStatusBadge({ status }: SocialAccountStatusBadgeProps) {
  if (status === 'CONNECTED') {
    return <Badge>Conectada</Badge>;
  }

  if (status === 'EXPIRED') {
    return <Badge variant="secondary">Token expirado</Badge>;
  }

  if (status === 'ERROR') {
    return <Badge variant="destructive">Error</Badge>;
  }

  return <Badge variant="outline">Desconectada</Badge>;
}
