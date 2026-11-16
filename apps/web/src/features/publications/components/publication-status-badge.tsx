import { CircleCheck, CircleX, Clock3, Loader2 } from 'lucide-react';

const states = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock3,
    color: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  PUBLISHING: {
    label: 'Publicando',
    icon: Loader2,
    color: 'border-primary/25 bg-primary/10 text-primary dark:text-blue-400',
  },
  PUBLISHED: {
    label: 'Publicada',
    icon: CircleCheck,
    color: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  FAILED: {
    label: 'Fallida',
    icon: CircleX,
    color: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
};

export function PublicationStatusBadge({ status }: { status: string }) {
  const state = states[status as keyof typeof states];
  if (!state)
    return <span className="break-all rounded-full border px-2.5 py-1 text-xs">{status}</span>;
  const Icon = state.icon;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${state.color}`}
    >
      <Icon
        aria-hidden="true"
        className={`size-3 shrink-0 ${status === 'PUBLISHING' ? 'animate-spin motion-reduce:animate-none' : ''}`}
      />
      {state.label}
    </span>
  );
}
