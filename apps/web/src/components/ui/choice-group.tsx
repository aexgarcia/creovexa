'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  visual?: ReactNode;
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
  className,
}: {
  label: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2">
      <legend className="mb-2 text-[13px] font-medium">{label}</legend>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'relative flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] border px-3 py-2 text-center text-[13px] transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring has-disabled:cursor-not-allowed has-disabled:opacity-60',
              value === option.value
                ? 'border-primary bg-primary/12 text-foreground'
                : 'border-input bg-control text-muted-foreground hover:border-ring/50 hover:text-foreground',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
            />
            {option.visual}
            <span className="min-w-0">
              <span className="block font-medium">{option.label}</span>
              {option.description && (
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
