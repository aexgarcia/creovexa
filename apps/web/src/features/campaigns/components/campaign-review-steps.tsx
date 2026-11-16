import { Check } from 'lucide-react';

export function CampaignReviewSteps({
  hasCopy,
  hasFlyer,
  approved,
  failed,
}: {
  hasCopy: boolean;
  hasFlyer: boolean;
  approved: boolean;
  failed: boolean;
}) {
  const steps = [
    { label: 'Brief', done: true },
    { label: 'Textos', done: hasCopy },
    { label: 'Flyer', done: hasFlyer },
    { label: 'Revisión', done: approved },
  ];
  const next = failed ? -1 : steps.findIndex((step) => !step.done);
  return (
    <ol
      aria-label="Recorrido de revisión"
      className="grid grid-cols-4 gap-2 rounded-2xl border bg-card p-3 sm:gap-4 sm:p-4"
    >
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={index === next ? 'step' : undefined}
          className={
            'flex min-w-0 flex-col items-center gap-2 rounded-xl px-1 py-2 text-[11px] sm:flex-row sm:justify-center sm:px-3 sm:text-xs ' +
            (index === next
              ? 'bg-primary/10 text-foreground'
              : step.done
                ? 'text-foreground'
                : 'text-muted-foreground')
          }
        >
          <span
            className={
              'flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ' +
              (step.done
                ? 'border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan'
                : index === next
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border')
            }
          >
            {step.done ? <Check aria-hidden="true" className="size-3" /> : index + 1}
          </span>
          <span>
            {step.label}
            <span className="sr-only">
              {step.done ? ': completado' : index === next ? ': siguiente paso' : ': pendiente'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
