'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { TextListField } from '@/components/ui/text-list-field';
import type {
  AddressForm,
  Contact,
  EmojiStyle,
  Typography,
} from '../services/company-settings.service';

export interface BrandVoiceDraft {
  typography: Typography | '';
  visualStyle: string;
  contact: Contact;
  defaultLegalText: string;
  forbiddenWords: string;
  audience: string;
  valueProps: string[];
  emojiStyle: EmojiStyle;
  addressForm: AddressForm;
  copyExamples: string[];
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

// Cómo escribe la IA tus publicaciones (ADR-0029).
export function BrandCopyFields({ draft, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="organization-audience">
          Tu cliente típico{' '}
          <span className="ml-auto text-xs font-normal text-muted-foreground">Opcional</span>
        </Label>
        <Input
          id="organization-audience"
          maxLength={200}
          placeholder="Ej. oficinistas de Lima que toman café cada mañana"
          value={draft.audience}
          onChange={(event) => onChange({ ...draft, audience: event.target.value })}
        />
      </div>
      <TextListField
        id="organization-value-props"
        label="Lo que te diferencia"
        items={draft.valueProps}
        onChange={(valueProps) => onChange({ ...draft, valueProps })}
        max={3}
        maxLength={80}
        placeholder="Ej. Delivery en Lima Metropolitana"
        duplicateMessage="Ya está en la lista."
        help="La IA usa como máximo uno por publicación y tal cual lo escribes: anota solo lo que siempre es cierto."
      />
      <ChoiceGroup<EmojiStyle>
        label="Emojis"
        value={draft.emojiStyle}
        onValueChange={(emojiStyle) => onChange({ ...draft, emojiStyle })}
        className="grid grid-cols-1 sm:grid-cols-3"
        options={[
          { value: 'NONE', label: 'Ninguno', description: 'Texto sobrio' },
          { value: 'FEW', label: 'Pocos', description: 'De uno a tres' },
          { value: 'EXPRESSIVE', label: 'Expresivo', description: 'De tres a seis' },
        ]}
      />
      <ChoiceGroup<AddressForm>
        label="Cómo le hablas al cliente"
        value={draft.addressForm}
        onValueChange={(addressForm) => onChange({ ...draft, addressForm })}
        className="grid grid-cols-2"
        options={[
          { value: 'TU', label: 'De tú', description: '«Pídelo ya»' },
          { value: 'USTED', label: 'De usted', description: '«Pídalo ya»' },
        ]}
      />
      <TextListField
        id="organization-copy-examples"
        label="Publicaciones de ejemplo"
        items={draft.copyExamples}
        onChange={(copyExamples) => onChange({ ...draft, copyExamples })}
        max={3}
        maxLength={600}
        multiline
        placeholder="Pega una publicación tuya que te guste cómo quedó."
        duplicateMessage="Esta publicación ya está en la lista."
        help="Hasta 3. La IA imita su voz y su ritmo, nunca copia sus frases."
      />
    </div>
  );
}
