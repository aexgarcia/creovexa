'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Contact, Typography } from '../services/company-settings.service';

// Lo que el usuario edita como texto; se convierte a listas al guardar.
export interface BrandVoiceDraft {
  typography: Typography | '';
  visualStyle: string;
  contact: Contact;
  defaultLegalText: string;
  forbiddenWords: string;
}

const TYPOGRAPHIES: { value: Typography; label: string }[] = [
  { value: 'SANS_MODERN', label: 'Moderna, sin serifa' },
  { value: 'SERIF_ELEGANT', label: 'Elegante, con serifa' },
  { value: 'ROUNDED', label: 'Redondeada, amigable' },
  { value: 'CONDENSED_BOLD', label: 'Condensada y audaz' },
  { value: 'HANDWRITTEN', label: 'Manuscrita' },
];

const CONTACT_FIELDS: { key: keyof Contact; label: string; placeholder: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+51 999 999 999' },
  { key: 'website', label: 'Web', placeholder: 'tuempresa.pe' },
  { key: 'instagram', label: 'Instagram', placeholder: '@tuempresa' },
  { key: 'address', label: 'Dirección', placeholder: 'Av. Larco 123, Miraflores' },
];

/** Palabras separadas por coma, sin vacías. */
export const splitWords = (value: string) =>
  value
    .split(',')
    .map((word) => word.trim())
    .filter(Boolean);

export function BrandVoiceFields({
  draft,
  onChange,
}: {
  draft: BrandVoiceDraft;
  onChange: (draft: BrandVoiceDraft) => void;
}) {
  const set = <K extends keyof BrandVoiceDraft>(key: K, value: BrandVoiceDraft[K]) =>
    onChange({ ...draft, [key]: value });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="organization-typography">Tipografía</Label>
          <select
            id="organization-typography"
            className="w-full rounded border bg-background p-2 text-sm"
            value={draft.typography}
            onChange={(e) => set('typography', e.target.value as Typography | '')}
          >
            <option value="">Que la elija la IA</option>
            {TYPOGRAPHIES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization-visual-style">Estilo visual</Label>
          <Input
            id="organization-visual-style"
            placeholder="Ej. artesanal, cálido, fotografía natural"
            value={draft.visualStyle}
            onChange={(e) => set('visualStyle', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Hasta 5 palabras, separadas por coma.</p>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium">Contacto</p>
        <p className="text-xs text-muted-foreground">
          Solo aparece en los flyers cuya plantilla lo pide.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTACT_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`organization-contact-${key}`}>{label}</Label>
              <Input
                id={`organization-contact-${key}`}
                maxLength={100}
                placeholder={placeholder}
                value={draft.contact[key] ?? ''}
                onChange={(e) => set('contact', { ...draft.contact, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization-legal">Texto legal por defecto (opcional)</Label>
        <Input
          id="organization-legal"
          maxLength={200}
          placeholder="Ej. Imágenes referenciales."
          value={draft.defaultLegalText}
          onChange={(e) => set('defaultLegalText', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization-forbidden">Palabras que nunca debe usar el flyer</Label>
        <Input
          id="organization-forbidden"
          placeholder="Ej. gratis, el mejor"
          value={draft.forbiddenWords}
          onChange={(e) => set('forbiddenWords', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Separadas por coma, hasta 20.</p>
      </div>
    </div>
  );
}
