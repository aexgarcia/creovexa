'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ProductAttributesField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');
  const attributes = value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  function add() {
    const next = draft.trim();
    if (!next) return;
    if (attributes.some((item) => item.toLocaleLowerCase('es') === next.toLocaleLowerCase('es'))) {
      setLocalError('Esta característica ya está en la lista.');
      return;
    }
    if (attributes.length >= 5) return;
    onChange([...attributes, next].join('\n'));
    setDraft('');
    setLocalError('');
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <label htmlFor="attribute-draft" className="font-medium">
          Características clave
        </label>
        <span className="text-xs text-muted-foreground">{attributes.length} de 5</span>
      </div>
      <ol className="space-y-2" aria-label="Características del producto">
        {attributes.map((attribute, index) => (
          <li
            key={index}
            className="flex items-center gap-3 rounded-[10px] border bg-control px-3 py-2"
          >
            <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
            <span className="min-w-0 flex-1 break-words text-[13px]">{attribute}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Quitar ${attribute}`}
              onClick={() => onChange(attributes.filter((_, i) => i !== index).join('\n'))}
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ol>
      {attributes.length < 5 && (
        <div className="flex gap-2">
          <Input
            id="attribute-draft"
            value={draft}
            maxLength={60}
            placeholder="Ej. 100 % arábica"
            aria-describedby="attributes-help attributes-error"
            aria-invalid={Boolean(error || localError)}
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
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>
      )}
      <p id="attributes-help" className="text-xs text-muted-foreground">
        Pulsa Añadir para incluir cada una y ordénalas por importancia. Guardarlas aquí no hace que
        aparezcan todas: la plantilla elegida en la campaña decide cuántas mostrar, incluso ninguna.
      </p>
      {(error || localError) && (
        <p id="attributes-error" role="alert" className="text-xs text-destructive">
          {error || localError}
        </p>
      )}
    </div>
  );
}
