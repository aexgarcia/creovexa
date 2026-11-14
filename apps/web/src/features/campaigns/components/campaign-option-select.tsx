'use client';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search } from 'lucide-react';

export function CampaignOptionSelect<T extends { id: string; name: string }>({
  id,
  items,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  items: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={onChange}
      itemToStringLabel={(item) => item.name}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      disabled={disabled}
    >
      <Combobox.InputGroup className="flex h-11 items-center gap-2 rounded-lg border bg-background px-3 focus-within:ring-2 focus-within:ring-ring/50">
        <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
        />
        <Combobox.Trigger
          aria-label="Mostrar opciones"
          className="rounded p-1 text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ChevronDown className="size-4" />
        </Combobox.Trigger>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-50">
          <Combobox.Popup className="w-[var(--anchor-width)] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
            <Combobox.Empty className="p-4 text-sm text-muted-foreground">
              No se encontraron coincidencias.
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto overscroll-contain">
              {(item: T) => (
                <Combobox.Item
                  key={item.id}
                  value={item}
                  className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                >
                  <span className="min-w-0 flex-1 break-words">{item.name}</span>
                  <Combobox.ItemIndicator>
                    <Check className="size-4 text-primary" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
