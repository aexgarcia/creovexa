'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChoiceGroup } from '@/components/ui/choice-group';
import type { Contact, Typography } from '../services/company-settings.service';

export interface BrandVoiceDraft {
  typography: Typography | '';
  visualStyle: string;
  contact: Contact;
  defaultLegalText: string;
  forbiddenWords: string;
}
export const splitWords = (value: string) =>
  value
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean);
type Props = { draft: BrandVoiceDraft; onChange: (draft: BrandVoiceDraft) => void };
const CONTACT_FIELDS: { key: keyof Contact; label: string; placeholder: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+51 999 999 999' },
  { key: 'website', label: 'Web', placeholder: 'tuempresa.pe' },
  { key: 'instagram', label: 'Instagram', placeholder: '@tuempresa' },
  { key: 'address', label: 'Dirección', placeholder: 'Av. Larco 123, Miraflores' },
];

export function BrandTypographyFields({ draft, onChange }: Props) {
  return (
    <div className="space-y-5">
      <ChoiceGroup<Typography | ''>
        label="Tipografía"
        value={draft.typography}
        onValueChange={(value) => onChange({ ...draft, typography: value })}
        className="grid grid-cols-1 sm:grid-cols-2 [&>label]:justify-start [&>label]:py-3 [&>label]:text-left"
        options={[
          {
            value: '',
            label: 'Que la elija la IA',
            description: 'Según tu rubro y estilo',
            visual: (
              <span
                aria-hidden="true"
                className="w-9 shrink-0 text-center text-2xl text-brand-cyan"
              >
                Aa
              </span>
            ),
          },
          {
            value: 'SANS_MODERN',
            label: 'Sans moderna',
            description: 'Limpia y actual',
            visual: (
              <span aria-hidden="true" className="w-9 shrink-0 text-center font-sans text-2xl">
                Aa
              </span>
            ),
          },
          {
            value: 'SERIF_ELEGANT',
            label: 'Serif elegante',
            description: 'Clásica, premium',
            visual: (
              <span aria-hidden="true" className="w-9 shrink-0 text-center font-serif text-2xl">
                Aa
              </span>
            ),
          },
          {
            value: 'ROUNDED',
            label: 'Redondeada',
            description: 'Amable, cercana',
            visual: (
              <span aria-hidden="true" className="w-9 shrink-0 text-center text-2xl font-bold">
                Aa
              </span>
            ),
          },
          {
            value: 'CONDENSED_BOLD',
            label: 'Condensada audaz',
            description: 'Fuerte, para ofertas',
            visual: (
              <span
                aria-hidden="true"
                className="w-9 shrink-0 scale-x-75 text-center text-2xl font-black"
              >
                Aa
              </span>
            ),
          },
          {
            value: 'HANDWRITTEN',
            label: 'Manuscrita',
            description: 'Artesanal, personal',
            visual: (
              <span
                aria-hidden="true"
                className="w-9 shrink-0 text-center font-serif text-2xl italic"
              >
                Aa
              </span>
            ),
          },
        ]}
      />
      <div className="space-y-2">
        <Label htmlFor="organization-visual-style">
          Estilo visual{' '}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {splitWords(draft.visualStyle).length} de 5
          </span>
        </Label>
        <Input
          id="organization-visual-style"
          placeholder="artesanal, cálido, fotografía natural"
          value={draft.visualStyle}
          onChange={(event) => onChange({ ...draft, visualStyle: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Hasta 5 expresiones separadas por coma. Las muestras «Aa» son orientativas, no una fuente
          final.
        </p>
      </div>
    </div>
  );
}
export function BrandContactFields({ draft, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CONTACT_FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`organization-contact-${key}`}>{label}</Label>
          <Input
            id={`organization-contact-${key}`}
            maxLength={100}
            placeholder={placeholder}
            value={draft.contact[key] ?? ''}
            onChange={(event) =>
              onChange({ ...draft, contact: { ...draft.contact, [key]: event.target.value } })
            }
          />
        </div>
      ))}
    </div>
  );
}
export function BrandTextRulesFields({ draft, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="organization-legal">
          Texto legal por defecto{' '}
          <span className="ml-auto text-xs font-normal text-muted-foreground">Opcional</span>
        </Label>
        <Input
          id="organization-legal"
          maxLength={200}
          placeholder="Ej. Imágenes referenciales."
          value={draft.defaultLegalText}
          onChange={(event) => onChange({ ...draft, defaultLegalText: event.target.value })}
        />
        <p className="text-right font-mono text-xs text-muted-foreground">
          {draft.defaultLegalText.length}/200
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization-forbidden">Palabras que el flyer nunca debe usar</Label>
        <Input
          id="organization-forbidden"
          placeholder="Ej. gratis, el mejor"
          value={draft.forbiddenWords}
          onChange={(event) => onChange({ ...draft, forbiddenWords: event.target.value })}
        />
        <p className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>Separadas por coma, hasta 20.</span>
          <span className="shrink-0 font-mono">
            {splitWords(draft.forbiddenWords).length} de 20
          </span>
        </p>
      </div>
      <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        CTA predeterminado · Próximamente
      </div>
    </div>
  );
}
