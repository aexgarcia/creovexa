'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Lista corta de textos que se agregan de a uno, sin repetir (sin distinguir mayúsculas).
export function TextListField({
  id,
  label,
  items,
  onChange,
  max,
  maxLength,
  placeholder,
  help,
  duplicateMessage,
  multiline = false,
  error,
}: {
  id: string;
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  max: number;
  maxLength: number;
  placeholder: string;
  help: string;
  duplicateMessage: string;
  // Textos largos con saltos de línea: se agregan con el botón, no con Enter.
  multiline?: boolean;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');
  const draftId = `${id}-draft`;
  function add() {
    const next = draft.trim();
    if (!next) return;
    if (items.some((item) => item.toLocaleLowerCase('es') === next.toLocaleLowerCase('es'))) {
      setLocalError(duplicateMessage);
      return;
    }
    if (items.length >= max) return;
    onChange([...items, next]);
    setDraft('');
    setLocalError('');
  }
  const inputProps = {
    id: draftId,
    value: draft,
    maxLength,
    placeholder,
    'aria-describedby': `${id}-help ${id}-error`,
    'aria-invalid': Boolean(error || localError),
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <label htmlFor={draftId} className="font-medium">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">
          {items.length} de {max}
        </span>
      </div>
      {items.length > 0 && (
        <ol className="space-y-2" aria-label={label}>
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-3 rounded-[10px] border bg-control px-3 py-2"
            >
              <span className="pt-0.5 font-mono text-xs text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 whitespace-pre-line wrap-break-word text-[13px]">
                {item}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Quitar ${item.slice(0, 40)}`}
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ol>
      )}
      {items.length < max && (
        <div className={multiline ? 'space-y-2' : 'flex gap-2'}>
          {multiline ? (
            <Textarea
              {...inputProps}
              rows={4}
              onChange={(event) => {
                setDraft(event.target.value);
                setLocalError('');
              }}
              className="rounded-[10px] bg-control px-3.5 py-3 text-sm md:text-sm dark:bg-control"
            />
          ) : (
            <Input
              {...inputProps}
              onChange={(event) => {
                setDraft(event.target.value);
                setLocalError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
            />
          )}
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>
      )}
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {help}
      </p>
      {(error || localError) && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error || localError}
        </p>
      )}
    </div>
  );
}
