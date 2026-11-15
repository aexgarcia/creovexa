import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface FormSectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function FormSection({ title, description, icon: Icon, children }: FormSectionProps) {
  return (
    <section className="min-w-0 rounded-2xl border bg-card">
      <div className="flex items-start gap-3 px-5 pt-5 sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-brand-cyan/20 bg-brand-cyan/8 text-brand-cyan">
          <Icon aria-hidden="true" className="size-[18px]" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-[18px] p-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}
